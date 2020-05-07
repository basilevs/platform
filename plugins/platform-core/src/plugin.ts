//
// Copyright © 2020 Andrey Platov <andrey.v.platov@gmail.com>
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

import { Platform, Metadata } from '@anticrm/platform'
import { CorePlugin, Query, pluginId } from '.'
import core, {
  Obj, Doc, Ref, Bag, Class, Type, RefTo, SessionProto,
  PropertyType, BagOf, InstanceOf, Mixin, ArrayOf, Container
} from '.'
import { MemDb } from './memdb'

//////////

type Layout<T extends Obj> = T & { __layout: any } & SessionProto


class MixinProxyHandler implements ProxyHandler<string[]> {
  private doc: Doc

  constructor(doc: Doc) {
    this.doc = doc
  }

  get(target: string[], key: PropertyKey): any {
    const value = Reflect.get(target, key)
    return value
  }
}

class Mixins extends Type<PropertyType> {
  constructor(_class: Ref<Class<Type<PropertyType>>>) {
    super(_class)
    console.log('constructed mixins: ' + _class)
  }
  exert(value: string[], target: PropertyType, key: PropertyKey) {
    return new Proxy(value, new MixinProxyHandler(target as Doc))
  }
}

abstract class TDoc extends Obj implements Doc {
  _id: Ref<this>
  _mixins?: string[]
  protected constructor(_class: Ref<Class<Doc>>, _id: Ref<Doc>) {
    super(_class)
    this._id = _id as Ref<this>
  }
}

class ClassDocument<T extends Obj> extends TDoc implements Class<T> {
  attributes: Bag<Type<PropertyType>>
  extends?: Ref<Class<Obj>>
  native?: Metadata<T>
  constructor(_class: Ref<Class<Class<T>>>, _id: Ref<Class<T>>, attributes: Bag<Type<PropertyType>>, _extends: Ref<Class<Obj>>, native?: Metadata<T>) {
    super(_class, _id)
    this.attributes = attributes
    this.extends = _extends
    this.native = native
  }
  toIntlString(plural?: number): string { return this._id }
}


export class TCodePlugin implements CorePlugin {

  readonly platform: Platform
  readonly pluginId = pluginId

  private memdb: MemDb
  private prototypes = new Map<Ref<Class<Obj>>, Object>()
  private sessionProto: SessionProto

  constructor(platform: Platform) {
    this.platform = platform
    this.memdb = new MemDb()

    this.sessionProto = {
      getSession: () => this,
    }
  }

  private createPropertyDescriptors(attributes: Bag<Type<PropertyType>>) {
    const result = {} as { [key: string]: PropertyDescriptor }
    for (const key in attributes) {
      const passForward = key.startsWith('_')
      if (passForward) {
        result[key] = {
          get(this: Layout<Obj>) {
            return this.__layout[key] ?? attributes[key]._default
          },
          set(this: Layout<Obj>, value) {
            this.__layout[key] = value
          },
          enumerable: true,
        }
      } else {
        const attribute = attributes[key]
        const instance = this.instantiateEmbedded(attribute)
        result[key] = {
          get(this: Layout<Obj>) {
            const value = this.__layout[key]
            return instance.exert(value, this, key)
          },
          set(this: Layout<Obj>, value) {
            this.__layout[key] = instance.hibernate(value)
          },
          enumerable: true,
        }
      }
    }
    return result
  }

  private createPrototype<T extends Obj>(clazz: Ref<Class<T>>) {
    const classContainer = this.memdb.get(clazz)
    const extend = classContainer.extends as Ref<Class<Obj>>
    const parent = extend ? this.getPrototype(extend) : this.sessionProto
    const proto = Object.create(parent)
    this.prototypes.set(clazz, proto)

    const attributes = classContainer.attributes as Bag<Type<PropertyType>>
    const descriptors = this.createPropertyDescriptors(attributes)
    if (classContainer.native) {
      const proto = this.platform.getMetadata(classContainer.native as Metadata<Class<Obj>>)
      Object.assign(descriptors, Object.getOwnPropertyDescriptors(proto))
    }
    Object.defineProperties(proto, descriptors)
    return proto
  }

  getPrototype<T extends Obj>(clazz: Ref<Class<T>>): T {
    return this.prototypes.get(clazz) ?? this.createPrototype(clazz)
  }

  instantiateEmbedded<T extends Obj>(obj: T): T {
    const _class = obj._class
    const instance = Object.create(this.getPrototype(_class)) as Layout<T>
    instance._class = _class
    instance.__layout = obj
    return instance
  }

  private instantiateDoc<T extends Doc>(_class: Ref<Class<T>>, container: Container): T {
    const instance = Object.create(this.getPrototype(_class)) as Layout<T>
    instance._class = _class
    instance.__layout = container
    return instance
  }

  getInstance<T extends Doc>(ref: Ref<T>, as: Ref<Class<T>>): T {
    return this.instantiateDoc(as, this.memdb.get(ref))
  }

  newInstance<T extends Obj>(clazz: Ref<Class<T>>): T {
    throw new Error('not implemented')
  }

  ////

  find<T extends Doc>(clazz: Ref<Class<T>>, query: Query<T>): T[] {
    const layouts = this.memdb.findAll(clazz, query)
    return layouts.map(layout => this.instantiateDoc(clazz, layout))
  }

  findOne<T extends Doc>(clazz: Ref<Class<T>>, query: Query<T>): T | undefined {
    const result = this.find(clazz, query)
    return result.length > 0 ? result[0] : undefined
  }

  ////

  loadModel(docs: Container[]): void {
    this.memdb.load(docs)
  }

  ////

  mixin<M extends I, I extends Doc>(doc: Ref<I>, mixinClass: Ref<Mixin<M>>): M {
    // const layout = this.memdb.get(doc) as I
    // let mixins = layout._mixins
    // if (!mixins) {
    //   mixins = []
    //   layout._mixins = mixins
    // }
    // mixins.push(mixinClass as string)
    //   ; (layout as any)['$' + mixinClass] = { _class: mixinClass }

    throw new Error('not implemented')
  }
}

export default (platform: Platform): CorePlugin => {

  platform.setMetadata(core.native.Object, Obj.prototype)
  platform.setMetadata(core.native.RefTo, RefTo.prototype)
  platform.setMetadata(core.native.Type, Type.prototype)
  platform.setMetadata(core.native.BagOf, BagOf.prototype)
  platform.setMetadata(core.native.ArrayOf, ArrayOf.prototype)
  platform.setMetadata(core.native.InstanceOf, InstanceOf.prototype)

  platform.setMetadata(core.native.Mixins, Mixins.prototype)
  platform.setMetadata(core.native.ClassDocument, ClassDocument.prototype)

  return new TCodePlugin(platform)
}
