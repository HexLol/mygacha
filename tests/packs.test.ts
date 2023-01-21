// deno-lint-ignore-file no-explicit-any

import {
  assert,
  assertEquals,
  assertObjectMatch,
} from 'https://deno.land/std@0.172.0/testing/asserts.ts';

import {
  assertSpyCalls,
  stub,
} from 'https://deno.land/std@0.172.0/testing/mock.ts';

import { assertValidManifest } from '../src/validate.ts';

import packs from '../src/packs.ts';

import {
  Character,
  CharacterRole,
  DisaggregatedCharacter,
  DisaggregatedMedia,
  Manifest,
  ManifestType,
  Media,
  MediaFormat,
  MediaRelation,
  MediaType,
} from '../src/types.ts';

import { AniListCharacter, AniListMedia } from '../packs/anilist/types.ts';

Deno.test('list', async (test) => {
  await test.step('anilist', () => {
    const builtin = packs.list(ManifestType.Builtin);

    const manifest = builtin[0] as Manifest;

    assertEquals(builtin.length, 3);

    assertEquals(manifest, {
      'author': 'Fable',
      'type': ManifestType.Builtin,
      'id': 'anilist',
      'title': 'AniList',
      'description':
        'A pack powered by AniList. Contains a huge list of anime and manga characters',
      'url': 'https://anilist.co',
      'image':
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/AniList_logo.svg/512px-AniList_logo.svg.png',
      'commands': {
        'next_episode': {
          'source': 'nextEpisode',
          'description': 'Find when the next episode of an anime is airing',
          'options': [
            {
              'id': 'title',
              'description': 'The title for an anime',
              'type': 'string',
            },
          ],
        },
      },
    });

    assertValidManifest(manifest);
  });

  await test.step('vtubers', () => {
    const builtin = packs.list(ManifestType.Builtin);

    const manifest = builtin[1] as Manifest;

    assertEquals(builtin.length, 3);

    assertObjectMatch(manifest, {
      'author': 'Fable',
      'type': ManifestType.Builtin,
      'description': 'A pack containing a set of the most famous vtubers',
      'id': 'vtubers',
      'title': 'Vtubers',
    });

    assertValidManifest(manifest);
  });

  await test.step('x', () => {
    const builtin = packs.list(ManifestType.Builtin);

    const manifest = builtin[2] as Manifest;

    assertEquals(builtin.length, 3);

    assertEquals(manifest, {
      'author': 'Fable',
      'type': ManifestType.Builtin,
      'id': 'x',
      'description': 'A pack containing a set of extra commands',
      'commands': {
        'dice': {
          'source': 'roll',
          'description': 'Roll a ten-sided dice',
          'options': [
            {
              'id': 'amount',
              'description': 'The number of dices to roll',
              'type': 'integer',
            },
          ],
        },
      },
    });

    assertValidManifest(manifest);
  });

  await test.step('manual', () => {
    const list = packs.list(ManifestType.Manual);

    assertEquals(list.length, 0);
  });

  await test.step('no type', () => {
    const list = packs.list();

    assertEquals(list.length, 1);

    assertEquals(list[0].id, 'vtubers');
  });
});

Deno.test('disabled', async (test) => {
  await test.step('disabled media', () => {
    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        conflicts: ['another-pack:1'],
      },
    };

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assert(packs.isDisabled('another-pack:1'));
    } finally {
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('disabled character', () => {
    const manifest: Manifest = {
      id: 'pack-id',
      characters: {
        conflicts: ['another-pack:1'],
      },
    };

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assert(packs.isDisabled('another-pack:1'));
    } finally {
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('none', () => {
    const manifest: Manifest = {
      id: 'pack-id',
      characters: {
        conflicts: [],
      },
    };

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assert(!packs.isDisabled('another-pack:1'));
    } finally {
      listStub.restore();
      packs.clear();
    }
  });
});

Deno.test('manifest embeds', async (test) => {
  await test.step('builtin packs', () => {
    const message = packs.embed({
      manifest: {
        id: 'id',
        title: 'title',
        type: ManifestType.Builtin,
      },
      total: 2,
    });

    assertEquals(message.json(), {
      type: 4,
      data: {
        components: [{
          type: 1,
          components: [{
            custom_id: '_',
            disabled: true,
            label: '1/2',
            style: 2,
            type: 2,
          }, {
            custom_id: 'builtin=1',
            label: 'Next',
            style: 2,
            type: 2,
          }],
        }],
        embeds: [{
          description:
            'Builtin packs are developed and maintained directly by Fable',
          type: 2,
        }, {
          description: undefined,
          title: 'title',
          type: 2,
          url: undefined,
        }],
      },
    });
  });

  await test.step('manual packs', () => {
    const message = packs.embed({
      manifest: {
        id: 'id',
        title: 'title',
        type: ManifestType.Manual,
      },
      index: 1,
      total: 2,
    });

    assertEquals(message.json(), {
      type: 4,
      data: {
        components: [{
          type: 1,
          components: [{
            custom_id: 'manual=0',
            label: 'Prev',
            style: 2,
            type: 2,
          }, {
            custom_id: '_',
            disabled: true,
            label: '2/2',
            style: 2,
            type: 2,
          }],
        }],
        embeds: [{
          type: 2,
          description:
            'The following third-party packs were manually added by your server members',
        }, {
          description: undefined,
          title: 'title',
          type: 2,
          url: undefined,
        }],
      },
    });
  });

  await test.step('use id instead of title', () => {
    const message = packs.embed({
      manifest: {
        id: 'id',
        type: ManifestType.Manual,
      },
      total: 1,
    });

    assertEquals(message.json(), {
      type: 4,
      data: {
        embeds: [{
          type: 2,
          description:
            'The following third-party packs were manually added by your server members',
        }, {
          description: undefined,
          title: 'id',
          type: 2,
          url: undefined,
        }],
        components: [{
          type: 1,
          components: [{
            custom_id: '_',
            disabled: true,
            label: '1/1',
            style: 2,
            type: 2,
          }],
        }],
      },
    });
  });

  await test.step('no manifest', () => {
    const message = packs.embed({ total: 1 });

    assertEquals(message.json(), {
      type: 4,
      data: {
        components: [],
        embeds: [{
          type: 2,
          description: 'No packs have been added yet',
        }],
      },
    });
  });
});

Deno.test('search for media', async (test) => {
  await test.step('anilist id', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'anilist media',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [{
          id: '1',
          type: MediaType.Anime,
          format: MediaFormat.TV,
          title: {
            english: 'pack-id media',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      const results = await packs.media({ ids: ['anilist:1'] });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
      assertEquals(results[0].packId, 'anilist');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('pack id', async () => {
    const media: AniListMedia = {
      id: 1 as unknown as string,
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'anilist media',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [{
          id: '1',
          type: MediaType.Anime,
          format: MediaFormat.TV,
          title: {
            english: 'pack-id media',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      const results = await packs.media({ ids: ['pack-id:1'] });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
      assertEquals(results[0].packId, 'pack-id');
      assertEquals(results[0].title.english, 'pack-id media');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('no pack id specified', async () => {
    const media: AniListMedia = {
      id: 1 as unknown as string,
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'anilist media',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ ids: ['1'] });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('disabled anilist id', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'anilist media',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        conflicts: ['anilist:1'],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      const results = await packs.media({ ids: ['anilist:1'] });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('disabled pack id', async () => {
    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        conflicts: ['pack2:1'],
      },
    };

    const manifest2: Manifest = {
      id: 'pack2',
      media: {
        new: [{
          id: '1',
          type: MediaType.Anime,
          format: MediaFormat.TV,
          title: {
            english: 'media',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest, manifest2],
    );

    try {
      const results = await packs.media({ ids: ['pack2:1'] });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match english', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'fable',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ search: 'feble' });

      assertEquals(results.length, 1);
      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match romaji', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        romaji: 'fable',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ search: 'feble' });

      assertEquals(results.length, 1);
      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match native', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        native: 'fable',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ search: 'feble' });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match alias', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'x'.repeat(100),
      },
      synonyms: ['fable'],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ search: 'feble' });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match english with specified types', async () => {
    const media: AniListMedia[] = [{
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'fable',
      },
    }, {
      id: '2',
      type: MediaType.Manga,
      format: MediaFormat.Manga,
      title: {
        english: 'fable',
      },
    }];

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media,
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      let results = await packs.media({
        search: 'feble',
        type: MediaType.Anime,
      });

      assertEquals(results.length, 1);
      assertEquals(results[0].id, '1');
      assertEquals(results[0].type, 'ANIME');

      results = await packs.media({
        search: 'feble',
        type: MediaType.Manga,
      });

      assertEquals(results.length, 1);
      assertEquals(results[0].id, '2');
      assertEquals(results[0].type, 'MANGA');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match on initial sorting', async () => {
    const media: AniListMedia[] = [{
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'fable',
      },
      popularity: 0,
    }, {
      id: '2',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'fable',
      },
      popularity: 0,
    }];

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media,
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ search: 'feble' });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match on popularity', async () => {
    const media: AniListMedia[] = [{
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'febl',
      },
      popularity: 100,
    }, {
      id: '2',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'feble',
      },
      popularity: 0,
    }];

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media,
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ search: 'fable' });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
      assertEquals(results[0].popularity, 100);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('disabled anilist match', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'anilist media',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        conflicts: ['anilist:1'],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      const results = await packs.media({ search: 'anilist media' });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('disabled pack match', async () => {
    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        conflicts: ['pack2:1'],
      },
    };

    const manifest2: Manifest = {
      id: 'pack2',
      media: {
        new: [{
          id: '1',
          type: MediaType.Anime,
          format: MediaFormat.TV,
          title: {
            english: 'pack media',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest, manifest2],
    );

    try {
      const results = await packs.media({ search: 'pack media' });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('no matches', async () => {
    const media: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'abc',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.media({ search: 'd' });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });
});

Deno.test('search for characters', async (test) => {
  await test.step('anilist id', async () => {
    const character: AniListCharacter = {
      id: '1',
      name: {
        full: 'anilist character',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      characters: {
        new: [{
          id: '1',
          name: {
            english: 'pack-id character',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      const results = await packs.characters({ ids: ['anilist:1'] });

      assertEquals(results.length, 1);

      assertEquals(results[0], {
        id: '1',
        packId: 'anilist',
        name: {
          english: 'anilist character',
        },
      });
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('pack id', async () => {
    const character: AniListCharacter = {
      id: 1 as unknown as string,
      name: {
        full: 'anilist character',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      characters: {
        new: [{
          id: '1',
          name: {
            english: 'pack-id character',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      const results = await packs.characters({ ids: ['pack-id:1'] });

      assertEquals(results.length, 1);

      assertEquals(results[0], manifest.characters?.new?.[0]);

      assertEquals(results[0].id, '1');
      assertEquals(results[0].packId, 'pack-id');
      assertEquals(results[0].name.english, 'pack-id character');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('no pack id specified', async () => {
    const character: AniListCharacter = {
      id: 1 as unknown as string,
      name: {
        full: 'anilist character',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.characters({ ids: ['1'] });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match full', async () => {
    const character: AniListCharacter = {
      id: '1',
      name: {
        full: 'fable',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.characters({ search: 'feble' });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match native', async () => {
    const character: AniListCharacter = {
      id: '1',
      name: {
        full: 'x'.repeat(100),
        native: 'fable',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.characters({ search: 'feble' });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('match alias', async () => {
    const character: AniListCharacter = {
      id: '1',
      name: {
        full: 'x'.repeat(100),
        alternative: ['fable'],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.characters({ search: 'feble' });

      assertEquals(results.length, 1);

      assertEquals(results[0].id, '1');
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('no matches', async () => {
    const character: AniListCharacter = {
      id: '1',
      name: {
        full: 'abc',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      const results = await packs.characters({ search: 'd' });

      assertEquals(results.length, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });
});

Deno.test('aggregate media', async (test) => {
  await test.step('aggregate from anilist', async () => {
    const parent: AniListMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media parent',
      },
    };

    const character: AniListCharacter = {
      id: '2',
      name: {
        full: 'character name',
      },
    };

    const child: DisaggregatedMedia = {
      id: '1',
      packId: 'test',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media child',
      },
      relations: [{
        relation: MediaRelation.Parent,
        mediaId: 'anilist:1',
      }],
      characters: [{
        role: CharacterRole.Main,
        characterId: 'anilist:2',
      }],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [parent],
                characters: [character],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media: child }), {
        id: '1',
        packId: 'test',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'media child',
        },
        relations: {
          edges: [{
            relation: MediaRelation.Parent,
            node: {
              id: '1',
              packId: 'anilist',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media parent',
              },
            },
          }],
        },
        characters: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '2',
              packId: 'anilist',
              name: {
                english: 'character name',
              },
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 2);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('aggregate from pack', async () => {
    const parent: DisaggregatedMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media parent',
      },
    };

    const character: DisaggregatedCharacter = {
      id: '2',
      name: {
        english: 'character name',
      },
    };

    const child: DisaggregatedMedia = {
      id: '1',
      packId: 'test',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media child',
      },
      relations: [{
        relation: MediaRelation.Parent,
        mediaId: 'pack-id:1',
      }],
      characters: [{
        role: CharacterRole.Main,
        characterId: 'pack-id:2',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [parent],
      },
      characters: {
        new: [character],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media: child }), {
        id: '1',
        packId: 'test',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'media child',
        },
        relations: {
          edges: [{
            relation: MediaRelation.Parent,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media parent',
              },
            },
          }],
        },
        characters: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '2',
              packId: 'pack-id',
              name: {
                english: 'character name',
              },
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to the same media more than once (anilist)', async () => {
    const media: Media = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media parent',
      },
    };

    const child: DisaggregatedMedia = {
      id: '1',
      packId: 'test',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media child',
      },
      relations: [{
        relation: MediaRelation.Parent,
        mediaId: 'anilist:1',
      }, {
        relation: MediaRelation.SpinOff,
        mediaId: 'anilist:1',
      }],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media: child }), {
        id: '1',
        packId: 'test',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'media child',
        },
        relations: {
          edges: [{
            relation: MediaRelation.Parent,
            node: {
              id: '1',
              packId: 'anilist',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media parent',
              },
            },
          }, {
            relation: MediaRelation.SpinOff,
            node: {
              id: '1',
              packId: 'anilist',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media parent',
              },
            },
          }],
        },
        characters: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 1);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to the same media more than once (packs)', async () => {
    const media: DisaggregatedMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media parent',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [media],
      },
    };

    const child: DisaggregatedMedia = {
      id: '1',
      packId: 'test',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media child',
      },
      relations: [{
        relation: MediaRelation.Parent,
        mediaId: 'pack-id:1',
      }, {
        relation: MediaRelation.SpinOff,
        mediaId: 'pack-id:1',
      }],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media: child }), {
        id: '1',
        packId: 'test',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'media child',
        },
        relations: {
          edges: [{
            relation: MediaRelation.Parent,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media parent',
              },
            },
          }, {
            relation: MediaRelation.SpinOff,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media parent',
              },
            },
          }],
        },
        characters: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to a character as a media', async () => {
    const media: DisaggregatedMedia = {
      id: '1',
      packId: 'test',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'title',
      },
      relations: [{
        relation: MediaRelation.Adaptation,
        mediaId: 'pack-id:1',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      characters: {
        new: [{
          id: '1',
          name: {
            english: 'character name',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media }), {
        id: '1',
        packId: 'test',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'title',
        },
        relations: {
          edges: [],
        },
        characters: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to a non-existing ids', async () => {
    const media: DisaggregatedMedia = {
      id: '1',
      packId: 'test',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'title',
      },
      relations: [{
        relation: MediaRelation.Prequel,
        mediaId: 'anilist:1',
      }],
      characters: [{
        role: CharacterRole.Main,
        characterId: 'pack-id:1',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [],
      },
      characters: {
        new: [],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [],
                characters: [],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media }), {
        id: '1',
        packId: 'test',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'title',
        },
        relations: {
          edges: [],
        },
        characters: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 1);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to the same pack', async () => {
    const parent: DisaggregatedMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media parent',
      },
    };

    const spinoff: DisaggregatedMedia = {
      id: '2',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media spinoff',
      },
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [parent, spinoff],
      },
    };

    const child: DisaggregatedMedia = {
      id: '3',
      packId: 'pack-id',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media child',
      },
      relations: [{
        relation: MediaRelation.Parent,
        mediaId: 'pack-id:1',
      }, {
        relation: MediaRelation.SpinOff,
        mediaId: '2',
      }],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media: child }), {
        id: '3',
        packId: 'pack-id',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'media child',
        },
        relations: {
          edges: [{
            relation: MediaRelation.Parent,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media parent',
              },
            },
          }, {
            relation: MediaRelation.SpinOff,
            node: {
              id: '2',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media spinoff',
              },
            },
          }],
        },
        characters: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('no recursive aggregation', async () => {
    const spinoff: DisaggregatedMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media spinoff',
      },
      relations: [{
        mediaId: 'test:1',
        relation: MediaRelation.SpinOff,
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [spinoff],
      },
    };

    const adaptation: DisaggregatedMedia = {
      id: '1',
      packId: 'test',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media adaptation',
      },
      relations: [{
        relation: MediaRelation.Adaptation,
        mediaId: 'pack-id:1',
      }],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media: adaptation }), {
        id: '1',
        packId: 'test',
        type: MediaType.Anime,
        format: MediaFormat.TV,
        title: {
          english: 'media adaptation',
        },
        relations: {
          edges: [{
            relation: MediaRelation.Adaptation,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media spinoff',
              },
              relations: [{
                mediaId: 'test:1',
                relation: MediaRelation.SpinOff,
              }] as any,
            },
          }],
        },
        characters: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('already aggregated', async () => {
    const media: Media = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'title',
      },
      relations: {
        edges: [{
          relation: MediaRelation.Sequel,
          node: {
            id: '2',
            type: MediaType.Anime,
            format: MediaFormat.TV,
            title: {
              english: 'sequel',
            },
          },
        }],
      },
      characters: {
        edges: [{
          role: CharacterRole.Supporting,
          node: {
            id: '3',
            name: {
              english: 'character name',
            },
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media }), media);

      assertSpyCalls(fetchStub, 0);
      assertSpyCalls(listStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('empty', async () => {
    const media: Media = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'title',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Media>({ media }), {
        ...media,
        relations: {
          edges: [],
        },
        characters: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 0);
      assertSpyCalls(listStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });
});

Deno.test('aggregate characters', async (test) => {
  await test.step('aggregate from anilist', async () => {
    const media: Media = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media',
      },
    };

    const character: DisaggregatedCharacter = {
      id: '1',
      packId: 'test',
      name: {
        english: 'full name',
      },
      media: [{
        role: CharacterRole.Main,
        mediaId: 'anilist:1',
      }],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        id: '1',
        packId: 'test',
        name: {
          english: 'full name',
        },
        media: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '1',
              packId: 'anilist',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media',
              },
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 1);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('aggregate from pack', async () => {
    const media: DisaggregatedMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media',
      },
    };

    const character: DisaggregatedCharacter = {
      id: '1',
      packId: 'test',
      name: {
        english: 'full name',
      },
      media: [{
        role: CharacterRole.Main,
        mediaId: 'pack-id:1',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [media],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        id: '1',
        packId: 'test',
        name: {
          english: 'full name',
        },
        media: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media',
              },
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to the same media more than once (anilist)', async () => {
    const media: Media = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media',
      },
    };

    const character: DisaggregatedCharacter = {
      id: '1',
      packId: 'test',
      name: {
        english: 'full name',
      },
      media: [{
        role: CharacterRole.Main,
        mediaId: 'anilist:1',
      }, {
        role: CharacterRole.Supporting,
        mediaId: 'anilist:1',
      }],
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [media],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        id: '1',
        packId: 'test',
        name: {
          english: 'full name',
        },
        media: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '1',
              packId: 'anilist',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media',
              },
            },
          }, {
            role: CharacterRole.Supporting,
            node: {
              id: '1',
              packId: 'anilist',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media',
              },
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 1);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to the same media more than once (packs)', async () => {
    const media: DisaggregatedMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media',
      },
    };

    const character: DisaggregatedCharacter = {
      id: '1',
      packId: 'test',
      name: {
        english: 'full name',
      },
      media: [{
        role: CharacterRole.Main,
        mediaId: 'pack-id:1',
      }, {
        role: CharacterRole.Supporting,
        mediaId: 'pack-id:1',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [media],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        id: '1',
        packId: 'test',
        name: {
          english: 'full name',
        },
        media: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media',
              },
            },
          }, {
            role: CharacterRole.Supporting,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media',
              },
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to a non-existing ids', async () => {
    const character: DisaggregatedCharacter = {
      id: '1',
      packId: 'test',
      name: {
        english: 'full name',
      },
      media: [{
        role: CharacterRole.Main,
        mediaId: 'anilist:1',
      }, {
        role: CharacterRole.Main,
        mediaId: 'pack-id:1',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [],
      },
      characters: {
        new: [],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => ({
        ok: true,
        json: (() =>
          Promise.resolve({
            data: {
              Page: {
                media: [],
                characters: [],
              },
            },
          })),
      } as any),
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        id: '1',
        packId: 'test',
        name: {
          english: 'full name',
        },
        media: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 1);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('referring to the same pack', async () => {
    const character: DisaggregatedCharacter = {
      id: '3',
      packId: 'pack-id',
      name: {
        english: 'full name',
      },
      media: [{
        role: CharacterRole.Main,
        mediaId: 'pack-id:1',
      }, {
        role: CharacterRole.Main,
        mediaId: '2',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      media: {
        new: [{
          id: '1',
          type: MediaType.Anime,
          format: MediaFormat.TV,
          title: {
            english: 'media 1',
          },
        }, {
          id: '2',
          type: MediaType.Manga,
          format: MediaFormat.Manga,
          title: {
            english: 'media 2',
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        id: '3',
        packId: 'pack-id',
        name: {
          english: 'full name',
        },
        media: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media 1',
              },
            },
          }, {
            role: CharacterRole.Main,
            node: {
              id: '2',
              packId: 'pack-id',
              type: MediaType.Manga,
              format: MediaFormat.Manga,
              title: {
                english: 'media 2',
              },
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('no recursive aggregation', async () => {
    const media: DisaggregatedMedia = {
      id: '1',
      type: MediaType.Anime,
      format: MediaFormat.TV,
      title: {
        english: 'media',
      },
      relations: [{
        mediaId: 'test:1',
        relation: MediaRelation.SpinOff,
      }],
    };

    const character: DisaggregatedCharacter = {
      id: '1',
      packId: 'test',
      name: {
        english: 'full name',
      },
      media: [{
        role: CharacterRole.Main,
        mediaId: 'pack-id:1',
      }],
    };

    const manifest: Manifest = {
      id: 'pack-id',
      type: ManifestType.Builtin,
      media: {
        new: [media],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [manifest],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        id: '1',
        packId: 'test',
        name: {
          english: 'full name',
        },
        media: {
          edges: [{
            role: CharacterRole.Main,
            node: {
              id: '1',
              packId: 'pack-id',
              type: MediaType.Anime,
              format: MediaFormat.TV,
              title: {
                english: 'media',
              },
              relations: [{
                mediaId: 'test:1',
                relation: MediaRelation.SpinOff,
              }] as any,
            },
          }],
        },
      });

      assertSpyCalls(fetchStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('already aggregated', async () => {
    const character: Character = {
      id: '1',
      name: {
        english: 'full name',
      },
      media: {
        edges: [{
          role: CharacterRole.Main,
          node: {
            id: '2',
            type: MediaType.Anime,
            format: MediaFormat.TV,
            title: {
              english: 'media',
            },
          },
        }],
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), character);

      assertSpyCalls(fetchStub, 0);
      assertSpyCalls(listStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });

  await test.step('empty', async () => {
    const character: Character = {
      id: '1',
      name: {
        english: 'full name',
      },
    };

    const fetchStub = stub(
      globalThis,
      'fetch',
      () => undefined as any,
    );

    const listStub = stub(
      packs,
      'list',
      () => [],
    );

    try {
      assertEquals(await packs.aggregate<Character>({ character }), {
        ...character,
        media: {
          edges: [],
        },
      });

      assertSpyCalls(fetchStub, 0);
      assertSpyCalls(listStub, 0);
    } finally {
      fetchStub.restore();
      listStub.restore();
      packs.clear();
    }
  });
});

Deno.test('titles to array', async (test) => {
  await test.step('all titles', () => {
    const alias = packs.aliasToArray({
      romaji: 'romaji',
      native: 'native',
      english: 'english',
    });

    assertEquals(alias, [
      'english',
      'romaji',
      'native',
    ]);
  });

  await test.step('missing 1 title', () => {
    const alias = packs.aliasToArray({
      romaji: '',
      native: 'native',
      english: 'english',
    });

    assertEquals(alias, [
      'english',
      'native',
    ]);
  });
});
