import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private loadTeamsSubject = new Subject<void>();
  loadTeams$ = this.loadTeamsSubject.asObservable();

  requestLoadTeams() {
    this.loadTeamsSubject.next();
  }
}