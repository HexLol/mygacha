import {
  Client,
  fql,
  InstanceExpr,
  InventoryExpr,
  NumberExpr,
  RefExpr,
  ResponseExpr,
  StringExpr,
  UserExpr,
} from './fql.ts';

import {
  getGuild,
  getInstance,
  getInventory,
  getUser,
  Inventory,
} from './get_user_inventory.ts';

export function existsInParty(
  { inventory, characterRef }: {
    inventory: InventoryExpr;
    characterRef: RefExpr;
  },
): NumberExpr {
  const checkMember = (n: 1 | 2 | 3 | 4 | 5) => {
    return fql.Equals(
      characterRef,
      fql.Select(
        ['data', 'party', `member${n}`],
        inventory,
        fql.Null(),
      ),
    );
  };

  return fql.If(
    checkMember(1),
    1,
    fql.If(
      checkMember(2),
      2,
      fql.If(
        checkMember(3),
        3,
        fql.If(
          checkMember(4),
          4,
          fql.If(
            checkMember(5),
            5,
            fql.Null(),
          ),
        ),
      ),
    ),
  );
}

export function removeFromParty(
  { spot, inventory }: {
    spot: NumberExpr;
    inventory: InventoryExpr;
  },
): {
  member1?: RefExpr;
  member2?: RefExpr;
  member3?: RefExpr;
  member4?: RefExpr;
  member5?: RefExpr;
} {
  const getMember = (n: 1 | 2 | 3 | 4 | 5) => {
    return fql.If(
      fql.Equals(spot, n),
      fql.Null(),
      fql.Select(
        ['data', 'party', `member${n}`],
        inventory,
        fql.Null(),
      ),
    );
  };

  return {
    member1: getMember(1),
    member2: getMember(2),
    member3: getMember(3),
    member4: getMember(4),
    member5: getMember(5),
  };
}

export function setCharacterToParty(
  {
    user,
    inventory,
    instance,
    characterId,
    spot,
  }: {
    user: UserExpr;
    inventory: InventoryExpr;
    instance: InstanceExpr;
    characterId: StringExpr;
    spot?: NumberExpr;
  },
): unknown {
  return fql.Let({
    _match: fql.Match(
      fql.Index('characters_instance_id'),
      characterId,
      fql.Ref(instance),
    ),
    character: fql.If(
      fql.IsNonEmpty(fql.Var('_match')),
      fql.Get(fql.Var('_match')),
      fql.Null(),
    ),
  }, ({ character }) => {
    const getMember = (n: 1 | 2 | 3 | 4 | 5) => {
      // if character is already assigned to the party
      return fql.If(
        fql.Equals(
          fql.Select(['data', 'party', `member${n}`], inventory, fql.Null()),
          fql.Ref(character),
        ),
        // if true unassign the character
        fql.Null(),
        // return the character assigned to this spot as long as it's different
        fql.Select(['data', 'party', `member${n}`], inventory, fql.Null()),
      );
    };

    const updateParty = (n: 1 | 2 | 3 | 4 | 5, opts?: {
      initial?: Inventory['party'];
    }) => {
      return fql.Merge(
        opts?.initial ?? fql.Var<{ [key: string]: RefExpr }>(`member${n - 1}`),
        fql.If(
          fql.Equals(fql.Var('spot'), n),
          { [`member${n}`]: fql.Ref(character) },
          {},
        ),
      );
    };

    return fql.If(
      fql.IsNull(character),
      {
        ok: false,
        error: 'CHARACTER_NOT_FOUND',
      },
      fql.If(
        fql.Equals( // if user does own the character
          fql.Select(['data', 'user'], character),
          fql.Ref(user),
        ),
        fql.Let({
          spot: fql.If(
            fql.IsNull(spot),
            // if spot is null
            // find the first empty spot in the party
            fql.If(
              fql.IsNull(
                fql.Select(['data', 'party', 'member1'], inventory, fql.Null()),
              ),
              1,
              fql.If(
                fql.IsNull(
                  fql.Select(
                    ['data', 'party', 'member2'],
                    inventory,
                    fql.Null(),
                  ),
                ),
                2,
                fql.If(
                  fql.IsNull(
                    fql.Select(
                      ['data', 'party', 'member3'],
                      inventory,
                      fql.Null(),
                    ),
                  ),
                  3,
                  fql.If(
                    fql.IsNull(
                      fql.Select(
                        ['data', 'party', 'member4'],
                        inventory,
                        fql.Null(),
                      ),
                    ),
                    4,
                    5,
                  ),
                ),
              ),
            ),
            // deno-lint-ignore no-non-null-assertion
            spot!,
          ),
          member1: updateParty(1, {
            initial: {
              member1: getMember(1),
              member2: getMember(2),
              member3: getMember(3),
              member4: getMember(4),
              member5: getMember(5),
            },
          }),
          member2: updateParty(2),
          member3: updateParty(3),
          member4: updateParty(4),
          member5: updateParty(5),
          updatedInventory: fql.Update<Inventory>(fql.Ref(inventory), {
            // deno-lint-ignore no-explicit-any
            party: fql.Var('member5') as any,
          }),
        }, ({ updatedInventory }) => ({
          ok: true,
          inventory: fql.Ref(updatedInventory),
          character: fql.Ref(character),
        })),
        {
          ok: false,
          error: 'CHARACTER_NOT_OWNED',
          character: fql.Ref(character),
        },
      ),
    );
  });
}

export function swapCharactersInParty(
  {
    inventory,
    a,
    b,
  }: {
    inventory: InventoryExpr;
    a: NumberExpr;
    b: NumberExpr;
  },
): unknown {
  const getMember = (n: 1 | 2 | 3 | 4 | 5) => {
    return fql.If(
      fql.Equals(n, a),
      fql.Select(
        ['data', 'party', fql.Concat(['member', fql.ToString(b)])],
        inventory,
        fql.Null(),
      ),
      fql.If(
        fql.Equals(n, b),
        fql.Select(
          ['data', 'party', fql.Concat(['member', fql.ToString(a)])],
          inventory,
          fql.Null(),
        ),
        fql.Select(
          ['data', 'party', `member${n}`],
          inventory,
          fql.Null(),
        ),
      ),
    );
  };

  return fql.Let({
    party: {
      member1: getMember(1),
      member2: getMember(2),
      member3: getMember(3),
      member4: getMember(4),
      member5: getMember(5),
    },
    updatedInventory: fql.Update<Inventory>(fql.Ref(inventory), {
      // deno-lint-ignore no-explicit-any
      party: fql.Var('party') as any,
    }),
  }, ({ updatedInventory }) => ({
    ok: true,
    inventory: fql.Ref(updatedInventory),
  }));
}

export function removeCharacterFromParty(
  {
    inventory,
    spot,
  }: {
    spot: NumberExpr;
    inventory: InventoryExpr;
  },
): unknown {
  return fql.Let({
    party: removeFromParty({ spot, inventory }),
    character: fql.Select(
      ['data', 'party', fql.Concat(['member', fql.ToString(spot)])],
      inventory,
      fql.Null(),
    ),
    updatedInventory: fql.Update<Inventory>(fql.Ref(inventory), {
      // deno-lint-ignore no-explicit-any
      party: fql.Var('party') as any,
    }),
  }, ({ character, updatedInventory }) => ({
    ok: true,
    character,
    inventory: fql.Ref(updatedInventory),
  }));
}

export default function (client: Client): {
  indexers?: (() => Promise<void>)[];
  resolvers?: (() => Promise<void>)[];
} {
  return {
    resolvers: [
      fql.Resolver({
        client,
        name: 'set_character_to_party',
        lambda: (
          userId: string,
          guildId: string,
          characterId: string,
          spot?: number,
        ) => {
          return fql.Let(
            {
              user: getUser(userId),
              guild: getGuild(guildId),
              instance: getInstance(fql.Var('guild')),
              inventory: getInventory({
                user: fql.Var('user'),
                instance: fql.Var('instance'),
              }),
            },
            ({ user, inventory, instance }) =>
              setCharacterToParty({
                user,
                inventory,
                instance,
                characterId,
                spot,
              }) as ResponseExpr,
          );
        },
      }),
      fql.Resolver({
        client,
        name: 'swap_characters_in_party',
        lambda: (
          userId: string,
          guildId: string,
          a: number,
          b: number,
        ) => {
          return fql.Let(
            {
              user: getUser(userId),
              guild: getGuild(guildId),
              instance: getInstance(fql.Var('guild')),
              inventory: getInventory({
                user: fql.Var('user'),
                instance: fql.Var('instance'),
              }),
            },
            ({ inventory }) =>
              swapCharactersInParty({
                inventory,
                a,
                b,
              }) as ResponseExpr,
          );
        },
      }),
      fql.Resolver({
        client,
        name: 'remove_character_from_party',
        lambda: (
          userId: string,
          guildId: string,
          spot: number,
        ) => {
          return fql.Let(
            {
              user: getUser(userId),
              guild: getGuild(guildId),
              instance: getInstance(fql.Var('guild')),
              inventory: getInventory({
                user: fql.Var('user'),
                instance: fql.Var('instance'),
              }),
            },
            ({ inventory }) =>
              removeCharacterFromParty({
                inventory,
                spot,
              }) as ResponseExpr,
          );
        },
      }),
    ],
  };
}
