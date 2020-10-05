# Step 1 - Query for users and tasks

## User Service

1. Query for the users from the endpoint

   ```typescript
   users = this.http.get<User[]>(url)

   constructor(private readonly http: HttpClient){}
   ```

1. Cache the results of the query with `shareReplay`
   ```typescript
   users = this.http.get<User[]>(url).pipe(shareReplay(1))
   ```

## Task Service

1. Query for the tasks from the endpoint

   ```typescript
   tasks = this.http.get<Task[]>(url)

   constructor(private readonly http: HttpClient){}
   ```

1. Cache the results of the query with `shareReplay`
   ```typescript
   tasks = this.http.get<Task[]>(url).pipe(shareReplay(1))
   ```

# Step 2 - Merge user object onto task

## Task Service

1. Combine the users and tasks streams together using `combineLatest`

   ```typescript
   tasks = combineLatest([
       this.http.get<Task[]>(url),
       this.userService.users
   ]).pipe(
       map(([tasks, users]) => tasks.map(mergeUser(users)))
       shareReplay(1)
   )

   constructor(
       private readonly http: HttpClient,
       private readonly userService: UserService
   ) {}
   ```

# Step 3 - Periodically re-query both users and tasks

## User Service

1. use `timer` to re-query for users every 9 seconds
   ```typescript
   users = timer(0, 9000).pipe(
     switchMap(() => this.http.get<User[]>(url)),
     shareReplay(1),
   )
   ```

## Task Service

1. use `timer` to re-query for users every 4 seconds
   ```typescript
   tasks = combineLatest([
       timer(0, 4000).pipe(
           switchMap(() => this.http.get<Task[]>(url)
       ),
       this.userService.users
   ]).pipe(
       map(([tasks, users]) => tasks.map(mergeUser(users)))
       shareReplay(1)
   )
   ```

# Step 4 - Allow for creating of new tasks

## Task Service

1. Make `post` request for creating new task.
   ```typescript
   create(task: Task) {
       return this.http.post<Task>(url, task)
   }
   ```
1. Create local state so entire task list doesn't need to be refreshed. This
   allows for adding in only the 1 new task locally.

   ```typescript
   private _tasks: Task[] = []

   tasks = combineLatest([
      timer(0, 4000).pipe(
          switchMap(() => this.http.get<Task[]>(url)
      ),
      this.userService.users
   ]).pipe(
       map(([tasks, users]) => tasks.map(mergeUser(users))),
       tap(tasks => (this._tasks = tasks)),
       shareReplay(1),
   )

   create(task: Task) {
       return this.http.post<Task>(url, task).pipe(
           tap(newTask => {
               this._tasks = [...this._tasks, newTask]
           }),
       )
   }
   ```

1. Create a subject to trigger local change events

   ```typescript
   private readonly tasksSubject = new Subject<Task[]>()

   tasks = combineLatest([
       merge(
           this.tasksSubject,
           timer(0, 4000).pipe(
               switchMap(() => this.http.get<Task[]>(url))
           ),
       ),
       this.userService.users,
   ]).pipe(
       map(([tasks, users]) => tasks.map(mergeUser(users))),
       shareReplay(1),
   )

   create(task: Task) {
       return this.http.post<Task>(url, task).pipe(
           tap(newTask => {
               this._tasks = [...this._tasks, newTask]
               this.tasksSubject.next(this._tasks)
           }),
       )
   }
   ```

## App Component

1. Implement the create method.
   ```typescript
   create() {
        this.taskService
            .create({
                title: 'tester',
                dueDate: new Date().toISOString(),
                userId: 1,
            })
            .subscribe()
   }
   ```

# Step 5 - allow for updates to a task

## Task Service

1. Create method that updates the task with a `put` and merges it into the local
   state just like create
   ```typescript
   update(task: Task) {
       return this.http.put<Task>(url, task).pipe(
           tap(updatedTask => {
               this._tasks = [
                   ...this._tasks.filter(x => x.id !== task.id),
                   updatedTask,
               ]
               this.tasksSubject.next(this._tasks)
           }),
       )
   }
   ```

## App Component

1. Connect to the ag-grid updates
   ```typescript
   onCellValueChanged: ({ data }: { data: Task }) => {
       this.taskService.update(data).subscribe()
   },
   ```

# Step 6 - allow for deleting a task

## Task Service

1. allow for deleting a task with the `delete` http request
   ```typescript
   delete(task: Task) {
       return this.http.delete<void>(`${url}/${task.id}`).pipe(
            tap(() => {
                this._tasks = this._tasks.filter(x => x.id !== task.id)
                this.tasksSubject.next(this._tasks)
            }),
       )
   }
   ```

## App Component

1. Attach to the cell click for ag-grid for deleting the current row.
   ```typescript
   onCellClicked: ({ data }: { data: Task }) => {
        this.taskService.delete(data).subscribe()
    },
   ```

# BONUS ROUND

# Step 7: Handle concurrency issues with editing a Task when new tasks get sent from the interval.

## App Component

1. Pause receiving updates

   ```typescript
   private currentEditTask?: Task
   tasks = this.taskService.tasks.pipe(
        filter(() => this.currentEditTask == null),
    )
   ...

   public gridOptions: GridOptions = {
       ...
       onCellEditingStarted: ({data}: CellEditingStartedEvent) => {
           this.currentEditTask = data
       },
       onCellEditingStopped: () => {
           this.editingTask = undefined
           this.taskService.forceSendUpdates()
       }
   }
   ```

# Step 8: Handle knowing when a task that is being edited has changed on the server

## App Component

1. Get notified when the current task is updated.

   ```typescript
   ...
   public editingTaskHasChanges = false
   private editingTask?: Task
   private destroySubject = new Subject<void>()
   ...
   constructor(private taskService: TaskService) {
       taskService.tasks.pipe(
           takeUntil(this.destroySubject),
           map(tasks => this.editingTask == null ? null : tasks.find(x =>
               x.id === this.editingTask.id &&
               x.updateDate !== this.editingTask.updateDate)
           ),
           tap(task => {
               this.editingTaskHasChanges = task != null
           })
       ).subscribe()
   }

   public ngOnDestroy() {
       this.destroySubject.next()
       this.destroySubject.complete()
   }
   ...
   ```

   Now you can give a prompt to the user that the item they are currently
   editing has been updated on the server.

   ```html
   <!-- app.component.ts template -->
   <h3 *ngIf="editingTaskHasChanges">Editing Task Has Changes</h3>
   ```
