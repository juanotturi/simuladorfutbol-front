import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Team } from '../../models/team.model';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teams-list.component.html',
  styleUrls: ['./teams-list.component.scss']
})
export class TeamsListComponent implements OnInit, OnDestroy {

  teams: Team[] = [];
  isLoading = false;
  private subscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.subscription = this.navigationService.loadTeams$.subscribe(() => {
      this.loadTeams();
    });

    this.loadTeams();
  }

  loadTeams() {
    this.isLoading = true;
    this.apiService.getTeams().subscribe({
      next: (data) => {
        this.teams = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading teams', err);
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
