import { Routes } from '@angular/router';
import { TeamsListComponent } from './teams/teams-list/teams-list.component';
import { PlayMatchComponent } from './match/play-match/play-match.component';
import { HomeComponent } from './home/home/home.component';
import { PlayTournamentComponent } from './play-tournament/play-tournament.component';
import { CreateTournamentComponent } from './create-tournament/create-tournament.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'teams', component: TeamsListComponent },
  { path: 'play-match', component: PlayMatchComponent },
  { path: 'play-tournament', component: PlayTournamentComponent },
  { path: 'create-tournament', component: CreateTournamentComponent }
];
