import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { combineLatest, merge, Subject, timer } from 'rxjs'
import { map, shareReplay, switchMap, tap } from 'rxjs/operators'
import { Task } from './models/task'
import { User } from './models/user'
import { UserService } from './user.service'

const url = '/api/tasks'

function mergeUser(users: User[]) {
  return (task: Task): Task =>
    task.user == null
      ? {
          ...task,
          user: users.find(user => user.id === task.userId),
        }
      : task
}

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  // the current state of the tasks
  private _tasks: Task[] = []
  // trigger to let user know of local changes to the tasks
  private readonly tasksSubject = new Subject<Task[]>()

  tasks = combineLatest([
    merge(
      // watch for local changes to the tasks (create, update, delete)
      this.tasksSubject,
      // query the server for updates every X seconds
      timer(0, 5000).pipe(switchMap(() => this.http.get<Task[]>(url))),
    ),
    // combine in users to allow mapping task to user
    this.userService.users,
  ]).pipe(
    map(([tasks, users]) => tasks.map(mergeUser(users))),
    // Save the current state to _tasks.
    // This makes it possible for the taskSubject to send out updates
    tap(tasks => (this._tasks = tasks)),
    // cache the results
    shareReplay(1),
  )

  constructor(
    private readonly http: HttpClient,
    private readonly userService: UserService,
  ) {}

  /**
   * When you cancel updating we need to force a new event on the tasks
   * so any updates that have come in while you were editing get sent out
   */
  forceSendUpdates() {
    this.tasksSubject.next(this._tasks)
  }

  create(task: Task) {
    return this.http.post<Task>(url, task).pipe(
      tap(newTask => {
        this._tasks = [...this._tasks, newTask]
        this.tasksSubject.next(this._tasks)
      }),
    )
  }

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

  delete(task: Task) {
    return this.http.delete<void>(`${url}/${task.id}`).pipe(
      tap(() => {
        this._tasks = this._tasks.filter(x => x.id !== task.id)
        this.tasksSubject.next(this._tasks)
      }),
    )
  }
}
