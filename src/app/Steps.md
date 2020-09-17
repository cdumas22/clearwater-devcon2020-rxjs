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
