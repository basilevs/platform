<script type="ts">
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
  import { onDestroy } from 'svelte'
  import { Class, Obj, Ref } from '@anticrm/core'
  import task, { Task, TaskFieldType, TaskFieldValue } from '../..'
  import { getCoreService } from '../../utils'
  import UserInfo from '@anticrm/sparkling-controls/src/UserInfo.svelte'
  import StatusLabel from './StatusLabel.svelte'
  import ActionBar from '@anticrm/platform-ui/src/components/ActionBar.svelte'
  import { Action } from '@anticrm/platform-ui'
  import Comments from '@anticrm/chunter/src/components/Comments.svelte'
  import InlineEdit from '@anticrm/sparkling-controls/src/InlineEdit.svelte'
  import { CORE_MIXIN_SHORTID, ShortID } from '@anticrm/domains'

  export let _class: Ref<Class<Obj>>
  export let object: Task

  const coreService = getCoreService()

  let fieldValues: Map<TaskFieldType, TaskFieldValue[]> = new Map()

  let status: TaskFieldValue | undefined

  const model = coreService.getModel()

  // Load and subscribe to any task status values.
  coreService.subscribe(task.class.TaskFieldValue, {}, (docs) => {
    const fValues: Map<TaskFieldType, TaskFieldValue[]> = new Map()
    for (const d of docs) {
      let val = fValues.get(d.type)
      if (!val) {
        val = []
        fValues.set(d.type, val)
      }
      val.push(d)
    }
    fieldValues = fValues
  }, onDestroy)

  let statusActions: Action[] = []
  let taskShortId: ShortID

  $: {
    let sv = fieldValues.get(TaskFieldType.Status) || []
    let acts: Action[] = []
    for (const s of sv) {
      if (!status) {
        status = s
      }
      if (object && object.status === s._id) {
        status = s
      }
      if (object && object.status !== s._id) {
        acts.push({
          name: s.action,
          action: () => {
            coreService.update(object, null, { status: s._id })
          }
        })
      }
    }
    statusActions = acts
    taskShortId = model.as(object, CORE_MIXIN_SHORTID)
  }
</script>

<div class="taskContent">
  <div class="caption caption-1">
    <InlineEdit id="create_task__input__name" bind:value={object.title} width="100%"
                label="Name" placeholder="Name"
                on:change={() => {coreService.update(object, null, {title: object.title})}} />
  </div>
  <div class="taskStatusBar">
    <div class="taskName">{taskShortId.shortId}</div>
    {#if status}
      <StatusLabel text={status.title} color={status.color} />
    {/if}
  </div>
  <div class="created">
    <UserInfo url="https://platform.exhale24.ru/images/photo-1.png"
              title="Александр Алексеенко" />
    <div class="createdOn">30.11.20, 15:30</div>
  </div>
  <UserInfo url="https://platform.exhale24.ru/images/photo-2.png"
            title="Андрей Платов" subtitle="Исполнитель" />

  {#if statusActions.length > 0 }
    <ActionBar onTop="2" actions={statusActions} />
  {/if}

  <div class="description">
    <Comments {object} />
    <ul class="files">
      <li><a href="/">interfaceRpcErrors.docx</a></li>
      <li><a href="/">interfaceRpcErrors..docx</a></li>
    </ul>
  </div>
</div>

<style lang="scss">
  .taskContent {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .caption {
      max-width: 18em;
      margin-bottom: 0.5em;
    }

    .taskStatusBar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1em;

      .taskName {
        font-size: 14px;
        color: var(--status-blue-color);
      }
    }

    .created {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1em;

      .createdOn {
        font-size: 11px;
        font-weight: 500;
        color: var(--theme-content-trans-color);
      }
    }

    .actionBar {
      width: 100%;
      display: flex;
      flex-direction: row;
      margin-top: 2em;
      margin-bottom: 2em;
    }

    .description {
      overflow-y: auto;

      .files {
        list-style-type: none;
        margin: 0;
        padding: 0;
        margin-bottom: 1em;

        & > li {
          margin-bottom: 0.2em;
          margin-left: 2em;
          margin-top: 5px;
          position: relative;

          &::before {
            position: absolute;
            content: '';
            background-image: url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4.57422 12.3535L11.2917 5.636C13.2444 3.68338 16.4102 3.68338 18.3628 5.636V5.636C20.3154 7.58862 20.3154 10.7544 18.3628 12.7071L13.4131 17.6568' stroke='%23505050' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M4.57448 12.3533C3.20765 13.7201 3.20765 15.9362 4.57448 17.303C5.94132 18.6698 8.1574 18.6698 9.52423 17.303L14.1204 12.7068' stroke='%23505050' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M14.1197 12.707C14.9008 11.926 14.9008 10.6597 14.1197 9.8786C13.3387 9.09756 12.0724 9.09756 11.2913 9.8786L8.46289 12.707' stroke='%23505050' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");
            background-repeat: no-repeat;
            left: -2em;
            top: -0.25em;
            width: 24px;
            height: 24px;
          }
        }
      }
    }
  }
</style>
