import { Routes } from '@angular/router';
import { TeamsListComponent } from './teams/teams-list/teams-list.component';
import { PlayMatchComponent } from './match/play-match/play-match.component';

export const routes: Routes = [
  { path: '', redirectTo: 'teams', pathMatch: 'full' },
  { path: 'teams', component: TeamsListComponent },
  { path: 'play-match', component: PlayMatchComponent }
];
