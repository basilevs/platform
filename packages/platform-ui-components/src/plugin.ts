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

import { Platform } from '@anticrm/platform'
import { CoreService } from '@anticrm/platform-core'
import { UIService, AnyComponent } from '@anticrm/platform-ui'
import {
  UIComponentsService, PlatformInjectionKey, CoreServiceInjectionKey, Asset, UIServiceInjectionKey
} from '.'
import { h, ref, createApp, defineComponent } from 'vue'
import Root from './internal/Root.vue'

console.log('Plugin `ui` loaded')

/*!
 * Anticrm Platform™ UI Components Plugin
 * © 2020 Anticrm Platform Contributors. All Rights Reserved.
 * Licensed under the Eclipse Public License, Version 2.0
 */
export default async (platform: Platform, deps: { core: CoreService, ui: UIService }): Promise<UIComponentsService> => {
  console.log('Plugin `ui` started')
  const coreService = deps.core
  const uiService = deps.ui

  // V U E  A P P

  const app = createApp(Root)
    .provide(PlatformInjectionKey, platform)
    .provide(CoreServiceInjectionKey, coreService)
    .provide(UIServiceInjectionKey, uiService)

  app.config.globalProperties.$platform = platform

  // C O M P O N E N T  R E N D E R E R

  app.component('widget', defineComponent({
    props: {
      component: String // as PropType<Component<VueConstructor>>
    },
    setup (props, context) {
      console.log('widget:')
      console.log(props)
      console.log(context)
      return {
        resolved: ref(''),
      }
    },
    render () {
      const cached = platform.getResource(this.component as AnyComponent)
      if (cached) {
        return h(cached)
      }
      if (this.component !== this.resolved) {
        platform.resolve(this.component as AnyComponent).then(resolved => {
          this.resolved = this.component
        })
        return h('div', [])
      } else {
        const resolved = platform.getResource(this.resolved as AnyComponent)
        if (resolved) {
          return h(resolved)
        } else {
          return h('div', [])
        }
      }
    }
  }))

  // S E R V I C E

  return {
    getApp () { return app },
  }

}