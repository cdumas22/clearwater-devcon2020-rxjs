import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import { GridOptions, Module } from '@ag-grid-community/core'
import { Component } from '@angular/core'
import { Task } from './models/task'
import { User } from './models/user'
import { TaskService } from './task.service'

@Component({
  selector: 'app-root',
  styles: ['ag-grid-angular { height: 500px; }'],
  template: `<h1 style="text-align:center">Welcome to {{ title }}!</h1>
    <button type="button" (click)="create()">Create New Task</button>
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

  tasks = this.taskService.tasks

  gridOptions: GridOptions = {
    columnDefs: [
      {
        valueGetter: () => 'DELETE',
        width: 100,
        cellClass: 'delete-link',
        onCellClicked: ({ data }: { data: Task }) => {
          // this.taskService.delete(data).subscribe()
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
    onCellValueChanged: ({ data }: { data: Task }) => {
      // this.taskService.update(data).subscribe()
    },
  }

  constructor(private readonly taskService: TaskService) {}

  create() {
    // this.taskService
    //   .create({
    //     title: 'test',
    //     dueDate: new Date().toISOString(),
    //   } as Task)
    //   .subscribe()
    //create
  }
}
