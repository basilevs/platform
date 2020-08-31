//
// Copyright © 2020 Anticrm Platform Contributors.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { AnyLayout, Class, CoreDomain, Doc, Platform, Ref, Tx } from '@anticrm/platform'
import core, { CoreService } from '.'
import { ModelDb } from './modeldb'
import { createCache } from './indexeddb'
import rpcService from './rpc'

/*!
 * Anticrm Platform™ Core Plugin
 * © 2020 Anticrm Platform Contributors. All Rights Reserved.
 * Licensed under the Eclipse Public License, Version 2.0
 */
export default async (platform: Platform): Promise<CoreService> => {
  const model = new ModelDb()
  const offline = platform.getMetadata(core.metadata.Model)
  if (offline) {
    model.loadModel(offline[CoreDomain.Model])
  } else {
    throw new Error('not implemented')
  }

  const cache = await createCache('db5', model)

  interface Query {
    _class: Ref<Class<Doc>>
    query: AnyLayout
    instances: Doc[]
    listener: (result: Doc[]) => void
  }

  const queries = [] as Query[]

  function query (_class: Ref<Class<Doc>>, query: AnyLayout, listener: (result: Doc[]) => void): () => void {
    const q: Query = { _class, query, listener, instances: [] }
    queries.push(q)

    const done = false

    cache.find(_class as Ref<Class<Doc>>, query)
      .then(result => {
        // network call may perform faster than cache access :),
        // so we do not return cached results in this case
        if (!done) {
          q.instances = result
          listener(result)
        }
      })

    // coreProtocol.find(_class as Ref<Class<Doc>>, query) // !!!!! WRONG, need hibernate
    //   .then(async result => {
    //     done = true
    //     ; ((await cache).cache(result)).then(() => console.log('RESULTS CACHED'))
    //     return Promise.all(result.map(doc => prototypes.instantiateDoc(doc)))
    //   })
    //   .then(async result => {
    //     q.instances = result
    //     listener(result as unknown as Instance<T>[])
    //   })

    return () => {
      queries.splice(queries.indexOf(q), 1)
    }
  }

  // C O R E  P R O T O C O L  (C A C H E)

  const findOffline = (_class: Ref<Class<Doc>>, query: AnyLayout): Promise<Doc[]> => cache.find(_class, query)

  const coreOffline = {
    find: findOffline,
    findOne: (_class: Ref<Class<Doc>>, query: AnyLayout): Promise<Doc | undefined> => cache.findOne(_class, query),
    tx: (tx: Tx): Promise<void> => {
      const c = cache.tx(tx)
      for (const q of queries) {
        // TODO: check if given tx affect query results
        findOffline(q._class, q.query).then(result => {
          q.listener(result)
        })
      }
      return c
    },
    loadDomain: (domain: string, index?: string, direction?: string): Promise<Doc[]> => {
      if (domain === CoreDomain.Model) {
        return model.loadDomain(domain)
      } else {
        return cache.loadDomain(domain, index, direction)
      }
    }
  }

  // C O R E  P R O T O C O L  (R P C)

  const rpc = rpcService(platform)

  const coreRpc = {
    find: (_class: Ref<Class<Doc>>, query: AnyLayout): Promise<Doc[]> => rpc.request('find', _class, query),
    findOne: (_class: Ref<Class<Doc>>, query: AnyLayout): Promise<Doc | undefined> => rpc.request('findOne', _class, query),
    tx: (tx: Tx): Promise<void> => rpc.request('tx', tx),
    loadDomain: (): Promise<Doc[]> => rpc.request('loadDomain', [])
  }

  const proto = platform.getMetadata(core.metadata.Offline) ? coreOffline : coreRpc

  return {
    getModel () {
      return model
    },
    query,
    ...proto
  }
}
