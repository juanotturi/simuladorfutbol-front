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
  isVisible = false;
  private subscription?: Subscription;

  constructor(
    private apiService: ApiService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.isVisible = this.navigationService.getTeamsVisibility();

    if (this.isVisible && this.teams.length === 0) {
      this.loadTeams();
    }

    this.subscription = this.navigationService.toggleTeams$.subscribe((visible) => {
      this.isVisible = visible;
      if (this.isVisible && this.teams.length === 0) {
        this.loadTeams();
      } else if (!this.isVisible) {
        this.teams = [];
      }
    });
  }

  toggleTeams() {
    if (this.isVisible) {
      this.isVisible = false;
      this.teams = [];
    } else {
      this.isVisible = true;
      this.loadTeams();
    }
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
