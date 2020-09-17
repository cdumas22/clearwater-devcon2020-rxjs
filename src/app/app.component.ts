import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model'
import { GridOptions, Module } from '@ag-grid-community/core'
import { Component, OnDestroy } from '@angular/core'
import { Subject } from 'rxjs'
import { filter, map, takeUntil, tap } from 'rxjs/operators'
import { Task } from './models/task'
import { User } from './models/user'
import { TaskService } from './task.service'

@Component({
  selector: 'app-root',
  styles: ['ag-grid-angular { height: 500px; }'],
  template: `<h1 style="text-align:center">Welcome to {{ title }}!</h1>
    <button type="button" (click)="create()">Create New Task</button>
    <h3 *ngIf="editedItem != null" [title]="editedItem | json">
      Editing Task Has Changes
    </h3>
    <ag-grid-angular
      class="ag-theme-alpine"
      [gridOptions]="gridOptions"
      [rowData]="tasks | async"
      [modules]="modules"
    ></ag-grid-angular>`,
})
export class AppComponent implements OnDestroy {
  title = 'Where is the state? Thinking in a Reactive Way'
  modules: Module[] = [ClientSideRowModelModule]

  private editingTask?: Task
  private taskUpdated = false
  private readonly destroySubject = new Subject<void>()

  editedItem?: Task | null

  tasks = this.taskService.tasks.pipe(
    // if we are editing a task then pause updates to the tasks.
    // this allows the list not to change while editing
    filter(() => this.editingTask == null),
  )

  gridOptions: GridOptions = {
    columnDefs: [
      {
        valueGetter: () => 'DELETE',
        width: 100,
        cellClass: 'delete-link',
        onCellClicked: ({ data }: { data: Task }) => {
          this.taskService.delete(data).subscribe()
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
      this.editingTask = data
    },
    onCellValueChanged: ({ data }: { data: Task }) => {
      // create state for knowing if we have updated a task.
      // this is important to know if the cell stopped editing needs
      // to update the collection or not
      this.taskUpdated = true
      this.taskService.update(data).subscribe()
    },
    onCellEditingStopped: () => {
      this.editingTask = undefined
      // if a task was not updated then we want to force the collection
      // to update. This will handle cases where we were editing
      // when a timed update came through.
      if (!this.taskUpdated) {
        this.taskService.forceSendUpdates()
      }
      this.taskUpdated = false
    },
  }

  constructor(private readonly taskService: TaskService) {
    // We want to know if the currently editing task received changes
    // from the server.
    taskService.tasks
      .pipe(
        // clean up subscription on destroy
        takeUntil(this.destroySubject),
        map(tasks =>
          this.editingTask == null
            ? null
            : tasks.find(
                x =>
                  // if one of the tasks is being edited then find it
                  x.id === this.editingTask?.id &&
                  // only return it if the update dates differ (it has been updated on the server)
                  x.updateDate !== this.editingTask?.updateDate,
              ),
        ),
        tap(task => {
          // if there is a task here that means
          // that the task being edited has changed on the server
          this.editedItem = task
        }),
      )
      .subscribe()
  }

  create() {
    this.taskService
      .create({
        title: 'tester',
        dueDate: new Date().toISOString(),
        userId: 1,
      })
      .subscribe()
  }

  ngOnDestroy() {
    this.destroySubject.next()
    this.destroySubject.complete()
  }
}
