# Where is the State? Thinking in a Reactive Way

Reactive programming is a way of looking at data as streams. With this any
changes to the data should be a change to the stream.

You can merge different streams of data to create compilations and complex data
streams.

Subscribers will get all changes as a flow of data from the stream. This makes
it easy to propagate changes out to others and have one source for the state.

In this training we will look at a simple Task list. This list of tasks will
have users associated with it and will handle updating, creating, and deleting.

To get started, run `yarn install & yarn start`.

## Goals of training

1. GET tasks and users
2. Merge a user into an tasks that have a userId
3. POST(add)/PUT(update)/DELETE a task and merge it into the full list of tasks
4. Use an interval to periodically check for changes on both users and tasks.

**BONUS**

5. Handle concurrency issues with editing a Task when new tasks get sent from
   the interval.
6. Handle knowing when a task that is being edited has changed on the server

### Project layout

There are three files we will be working with:
[app.component.ts](src/app/app.component.ts),
[user.service.ts](src/app/user.service.ts), and
[task.service.ts](src/app/task.service.ts).

The api and backend have been mocked by the
[in-memory-db-service.ts](src/app/mocks/in-memory-db-service.ts). You shouldn't
have to deal with this but know that because of it you will not see network
requests happen with the http calls.

### 1. Get Tasks and Users

Retrieving data from an http endpoint is easy in Angular. Inject the HttpClient
into the service then use it.

```typescript
// user.service.ts
...
public users = this.http.get<User[]>(`/api/users`)
...
```

```typescript
// task.service.ts
...
public tasks = this.http.get<Task[]>(`/api/tasks`)
...
```

```typescript
// app.component.ts
public tasks = this.taskService.tasks
```

```html
<!-- app.component.ts template -->
<!-- using the async pipe to make the subscription to the tasks -->
<ag-grid-angular
  class="ag-theme-balham"
  [gridOptions]="gridOptions"
  [rowData]="tasks | async"
></ag-grid-angular>
```

This simple call will get the users from the endpoint. The downside is that
every time someone subscribes to it the http request will trigger. It is best to
cache the results. You do this by using the RxJS `shareReplay` operator.

```typescript
// user.service.ts
...
public users = this.http.get<User[]>(`/api/users`).pipe(
    // 1 specifies that you only want to replay the last (1) results from this observable
    shareReplay(1)
)
```

```typescript
// task.service.ts
...
public tasks = this.http.get<Task[]>(`/api/tasks`).pipe(
    shareReplay(1)
)
```

Doing this caches the results of the http call for other subscribers to use. It
is also long-lived. So even when all subscribers have unsubscribed this cache
value still exists. Then when another subscribe happens the cached value is
returned. This is a very handy operator for stateful entity services like users
and tasks.

### 2. Merge a user into an tasks that have a userId

For performance reasons and separation of concerns we do not want the tasks
endpoint to be return any user objects. The task does have a userId though. We
can use this to set the user on the task in the `task.service.ts`:

```typescript
// task.service.ts
...
public tasks = combineLatest(
    this.http.get<Task[]>(`/api/tasks`)
    this.userService.users,
).pipe(
    map(([tasks, users]) => tasks.map(mergeUser(users))),
    shareReplay(1)
)

constructor(
    private readonly http: HttpClient,
    private readonly userService: UserService
) {}
```

The `combineLatest` RxJS function will take the latest event from each of the
observables and send them along. This allows you to merge together the responses
from both tasks and users.

Map to the list of tasks that has the user property set.

The benefit of doing this is that when the list of users updates it will
automatically remap the users to the task and send out a new event on the tasks
stream.

### 3. POST(add)/PUT(update)/DELETE a task and merge it into the full list of tasks

The `task.service.ts` is an Angular service containing the state of the tasks.
This should be the place where any updates to a task happen. So to handle
adding, updating and deleting we need to inject something into the `tasks`
stream to let the steam know of these updates. We will use a `Subject` to be
this trigger that lets the stream know about changes.

```typescript
// task.service.ts
...
// the current state of the tasks
private _tasks: Task[] = []
// trigger to let user know of local changes to the tasks
private tasksSubject = new Subject<Task[]>()
public tasks = combineLatest(
    merge(
        this.tasksSubject,
        this.http.get<Task[]>(`/api/tasks`)
    )
    this.userService.users,
).pipe(
    map(([tasks, users]) => tasks.map(mergeUser(users))),
    // Save the current state to _tasks.
    // This makes it possible for the taskSubject to send out updates.
    tap(tasks => this._tasks = tasks),
    shareReplay(1)
)
...
```

Now implement create, update, and delete to send out the values, update our
internal `_tasks` state and then send those out in the `tasksSubject`.

```typescript
...
// It is important to have your endpoints return the newly created or updated item.
// This makes it easy to keep your app up to date without making expensive calls to get all the tasks again.

public create(task: Task) {
    return this.http.post<Task>(url, task).pipe(
        tap(newTask => {
            this._tasks = [...this._tasks, newTask]
            this.tasksSubject.next(this._tasks)
        }),
    )
}

public update(task: Task) {
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

public delete(task: Task) {
    return this.http.delete<void>(`${url}/${task.id}`).pipe(
        tap(() => {
            this._tasks = this._tasks.filter(x => x.id !== task.id)
            this.tasksSubject.next(this._tasks)
        }),
    )
}
...
```

### 4. Use an interval to periodically check for changes on both users and tasks.

In many applications there are multiple users working on the same data at the
same time. We want to keep everyone in sync. There are a few ways of doing this.
One of the better ways is using web-sockets to immediately send changes to all
users looking at the dataset. For this example though we will use the interval
approach. We will re-query for the entire list of tasks on an interval. Allowing
us to see changes that have not been made by the current user.

```typescript
//task.service.ts
...
public tasks = combineLatest([
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
...
```

```typescript
//user.service.ts
...
public users = timer(0, 12000).pipe(
    switchMap(() => this.http.get<User[]>(`/api/users`)),
    shareReplay(1)
)
...
```

### 5. Handle concurrency issues with editing a Task when new tasks get sent from the interval.

This setup is great. We have tasks and user merging together, we are getting
updates immediately when we update, create, or delete, and we are receiving
updates on an interval from the server to keep our list up to date with other
users.

Now there is an issue when editing a task we do not want it to update while we
are editing it. So we don't want to update the list whenever we are updating one
of the items.

To do this we will keep track of which task we are currently editing and pause
receiving events from our tasks stream while we have and editing task.

```typescript
// app.component.ts
...
private editingTask?: Task
public tasks = this.taskService.tasks.pipe(
    // filter allows us to stop listening to the stream whenever the value is false
    filter(() => this.editingTask == null)
)
...

public gridOptions: GridOptions = {
    ...
    // we are using ag-grid to update the task
    // ag-grid provides two methods to know when we start and stop editing.
    onCellEditingStarted: ({data}: CellEditingStartedEvent) => {
        this.editingTask = data
    },
    onCellEditingStopped: () => {
        this.editingTask = undefined
    }
}
```

### 6. Handle knowing when a task that is being edited has changed on the server

It would be nice to know if the item that we are editing has changed on the
server. We have already stopped listening to changes while we are editing, but
we could create another fork of our stream to watch for the currently editing
item having changed.

```typescript
// app.component.ts
...
public editingTaskHasChanges = false
private editingTask?: Task
// because we are subscribing to a stream ourselves we need
// to make sure we unsubscribe from it when the component
// gets destroyed. using a destroy subject is a clean way of
// doing this.
private destroySubject = new Subject<void>()
...
constructor(private taskService: TaskService) {
    taskService.tasks.pipe(
        // takeUntil will unsubscribe when the destroySubject gets next called
        takeUntil(this.destroySubject),
        map(tasks => this.editingTask == null ? null : tasks.find(x =>
            // if one of the tasks is being edited then find it
            x.id === this.editingTask.id &&
            // only return it if the update dates differ (it has been updated on the server)
            x.updateDate !== this.editingTask.updateDate)
        ),
        tap(task => {
            // if there is a task here that means
            // that the task being edited has changed on the server
            this.editingTaskHasChanges = task != null
        })
    ).subscribe()
}

public ngOnDestroy() {
    // when the component gets destroyed we want to next and complete
    // the destroy subject to cleanup any subscriptions in the component
    this.destroySubject.next()
    this.destroySubject.complete()
}
...
```

Now you can give a prompt to the user that the item they are currently editing
has been updated on the server.

```html
<!-- app.component.ts template -->
<h3 *ngIf="editingTaskHasChanges">Editing Task Has Changes</h3>
```

## Conclusion

Using RxJS streams create reliable efficient data flows in an application.

As you get use to thinking of data as a stream you can clean up interactions and
provide a more robust application where data seems to just magically stay
updated without having to create any state in the components.
