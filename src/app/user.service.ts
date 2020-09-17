import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { timer } from 'rxjs'
import { shareReplay, switchMap } from 'rxjs/operators'
import { User } from './models/user'

const url = '/api/users'

@Injectable({
  providedIn: 'root',
})
export class UserService {
  users = timer(0, 12000).pipe(
    switchMap(() => this.http.get<User[]>(url)),
    shareReplay(1),
  )

  constructor(private readonly http: HttpClient) {}
}
