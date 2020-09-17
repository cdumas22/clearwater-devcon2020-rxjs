import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import { GridOptions, Module } from '@ag-grid-community/core'
import { Component } from '@angular/core'
import { Observable } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import { Task } from './models/task'
import { User } from './models/user'
import { TaskService } from './task.service'

@Component({
  selector: 'app-root',
  styles: ['ag-grid-angular { height: 500px; }'],
  template: `<h1 style="text-align:center">Welcome to {{ title }}!</h1>
    <button type="button" (click)="create()">Create New Task</button>
    <h3 *ngIf="serverEditTask | async as e" [title]="e | json">
      Editing Task Has Changes
    </h3>
    <h5 *ngIf="httpRequestHappening">Task is saving/deleting</h5>
    <ag-grid-angular
      class="ag-theme-alpine"
      [gridOptions]="gridOptions"
      [rowData]="tasks | async"
      [modules]="modules"
    ></ag-grid-angular>`,
})
export class AppComponent {
  title = 'Where is the state? Thinking in a Reactive Way'
  modules: Module[] = [ClientSideRowModelModule]

  httpRequestHappening = false
  private currentEditTask?: Task
  serverEditTask = this.taskService.tasks.pipe(
    map(tasks =>
      tasks.find(
        t =>
          t.id === this.currentEditTask?.id &&
          t.updateDate &&
          this.currentEditTask?.updateDate &&
          t.updateDate > this.currentEditTask?.updateDate,
      ),
    ),
  )

  tasks = this.taskService.tasks.pipe(
    // if we are editing a task then pause updates to the tasks.
    // this allows the list not to change while editing
    filter(() => this.currentEditTask == null),
  )

  gridOptions: GridOptions = {
    columnDefs: [
      {
        valueGetter: () => 'DELETE',
        width: 100,
        cellClass: 'delete-link',
        onCellClicked: ({ data }: { data: Task }) => {
          this.subscribeAndLoad(this.taskService.delete(data))
        },
      },
      { field: 'id', sort: 'asc' },
      { field: 'title', editable: true },
      { field: 'updateDate' },
      {
        field: 'user',
        valueGetter: ({ data }: { data: Task }) => {
          const user: User | undefined = data.user
          return user != null ? `${user.firstName} ${user.lastName}` : '---'
        },
      },
    ],
    singleClickEdit: true,
    onCellEditingStarted: ({ data }: { data: Task }) => {
      this.currentEditTask = data
    },
    onCellValueChanged: ({ data }: { data: Task }) => {
      // create state for knowing if we have updated a task.
      // this is important to know if the cell stopped editing needs
      // to update the collection or not
      this.subscribeAndLoad(this.taskService.update(data))
    },
    onCellEditingStopped: () => {
      this.currentEditTask = undefined
      // This will handle cases where we were editing
      // when a timed update came through.
      this.taskService.forceSendUpdates()
    },
  }

  constructor(private readonly taskService: TaskService) {}

  create() {
    this.subscribeAndLoad(
      this.taskService.create({
        title: 'tester',
        dueDate: new Date().toISOString(),
        userId: 1,
      }),
    )
  }

  private subscribeAndLoad(observable: Observable<unknown>) {
    this.httpRequestHappening = true
    observable.subscribe(() => {
      this.httpRequestHappening = false
    })
  }
}
