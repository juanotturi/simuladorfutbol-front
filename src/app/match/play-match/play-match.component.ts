import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Team } from '../../models/team.model';
import { MatchResult } from '../../models/match-result.model';

@Component({
  selector: 'app-play-match',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './play-match.component.html',
  styleUrls: ['./play-match.component.scss']
})

export class PlayMatchComponent implements OnInit {
  teams: Team[] = [];
  selectedTeamA?: Team;
  selectedTeamB?: Team;
  isLoading = false;
  matchResult?: MatchResult;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
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

  playMatch() {
    if (!this.selectedTeamA || !this.selectedTeamB) {
      alert('Selecciona ambos equipos');
      return;
    }

    if (this.selectedTeamA == this.selectedTeamB) {
      alert('No se puede repetir el mismo equipo');
      return;
    }

    this.apiService.getMatchResult(this.selectedTeamA.score, this.selectedTeamB.score)
      .subscribe({
        next: (result) => {
          this.matchResult = result;
        },
        error: (err) => {
          console.error('Error playing match', err);
        }
      });
  }
}
