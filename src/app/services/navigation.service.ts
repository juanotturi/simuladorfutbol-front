import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  private isTeamsVisible = false;
  private toggleTeamsSubject = new BehaviorSubject<boolean>(this.isTeamsVisible);
  toggleTeams$ = this.toggleTeamsSubject.asObservable();

  requestTeamsToggle() {
    this.isTeamsVisible = !this.isTeamsVisible;
    this.toggleTeamsSubject.next(this.isTeamsVisible);
  }

  getTeamsVisibility(): boolean {
    return this.isTeamsVisible;
  }

  setTeamsVisibility(visible: boolean) {
    this.isTeamsVisible = visible;
    this.toggleTeamsSubject.next(this.isTeamsVisible);
  }
}
