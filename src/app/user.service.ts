import { Injectable } from '@angular/core'
import { EMPTY } from 'rxjs'

const url = '/api/users'

@Injectable({
  providedIn: 'root',
})
export class UserService {
  users = EMPTY
}
