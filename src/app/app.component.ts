import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import { GridOptions, Module } from '@ag-grid-community/core'
import { Component } from '@angular/core'
import { Task } from './models/task'
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

  editedItem?: Task | null

  tasks = this.taskService.tasks

  gridOptions: GridOptions = {
    columnDefs: [
      {
        valueGetter: () => 'DELETE',
        width: 100,
        cellClass: 'delete-link',
        onCellClicked: ({ data }: { data: Task }) => {},
      },
      { field: 'id', sort: 'asc' },
      { field: 'title', editable: true },
      { field: 'updateDate' },
      {
        field: 'user',
        valueGetter: ({ data }: { data: Task }) =>
          data.user != null
            ? `${data.user.firstName} ${data.user.lastName}`
            : '---',
      },
    ],
    singleClickEdit: true,
    onCellValueChanged: ({ data }: { data: Task }) => {},
  }

  constructor(private readonly taskService: TaskService) {}

  create() {
    //create
  }
}
