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
  isLoading = false;
  matchResult?: MatchResult;

  placeholderImage = '/assets/placeholder_pelota.png';
  isMatchPlayed = false;

  // Penales
  penaltyShootoutActive = false;
  penaltyVisible = false;
  penaltyTurns: ('✅' | '❌')[][] = [[], []];
  currentShooter: 0 | 1 = 0;
  penaltyWinner: Team | null = null;
  maxPenalties: number = 5;
  isSuddenDeath = false;
  isPenaltyInProgress = false;

  // Filtros y selección de equipos A y B
  typeA: 'SELECCION' | 'CLUB' | null = null;
  filterAConfLeague: string | null = null;
  selectedTeamA?: Team;

  typeB: 'SELECCION' | 'CLUB' | null = null;
  filterBConfLeague: string | null = null;
  selectedTeamB?: Team;

  confederations: string[] = ['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC', 'UEFA'];
  leagues: string[] = ['Liga BBVA', 'Serie A', 'Bundesliga', 'Premier League', 'Ligue 1', 'MLS'];

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
      error: () => {
        this.isLoading = false;
      }
    });
  }

  // Filtros dependientes
  getSecondLevelOptions(type: 'SELECCION' | 'CLUB' | null): string[] {
    if (type === 'SELECCION') return this.confederations;
    if (type === 'CLUB') return this.leagues;
    return [];
  }

  get filteredTeamsA(): Team[] {
    return this.teams
      .filter(t => this.typeA === 'SELECCION' ? !t.league : !!t.league)
      .filter(t => this.filterAConfLeague ? (t.confederation === this.filterAConfLeague || t.league === this.filterAConfLeague) : true);
  }

  get filteredTeamsB(): Team[] {
    return this.teams
      .filter(t => this.typeB === 'SELECCION' ? !t.league : !!t.league)
      .filter(t => this.filterBConfLeague ? (t.confederation === this.filterBConfLeague || t.league === this.filterBConfLeague) : true);
  }

  playMatch() {
    if (!this.selectedTeamA || !this.selectedTeamB) {
      alert('Selecciona ambos equipos');
      return;
    }
    if (this.selectedTeamA === this.selectedTeamB) {
      alert('No se puede repetir el mismo equipo');
      return;
    }

    this.isLoading = true;
    this.apiService.getMatchResult(this.selectedTeamA.score, this.selectedTeamB.score).subscribe({
      next: (result) => {
        this.matchResult = result;
        this.isMatchPlayed = true;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  startPenaltyShootout() {
    this.penaltyShootoutActive = true;
    this.isPenaltyInProgress = true;
    this.penaltyVisible = true;
    this.penaltyTurns = [[], []];
    this.penaltyWinner = null;
    this.isSuddenDeath = false;
    this.isMatchPlayed = false;

    this.currentShooter = Math.random() < 0.5 ? 0 : 1;
  }

  takePenalty() {
    if (!this.penaltyShootoutActive || this.penaltyWinner) return;

    const roll = Math.floor(Math.random() * 10) + 1;
    const result: '✅' | '❌' = roll <= 7 ? '✅' : '❌';

    this.penaltyTurns[this.currentShooter].push(result);

    this.checkPenaltyWinner();

    if (!this.penaltyWinner) {
      this.currentShooter = this.currentShooter === 0 ? 1 : 0;
    }
  }

  checkPenaltyWinner() {
    const [aResults, bResults] = this.penaltyTurns;
    const aGoals = aResults.filter(r => r === '✅').length;
    const bGoals = bResults.filter(r => r === '✅').length;

    if (!this.isSuddenDeath) {
      const aRemaining = this.maxPenalties - aResults.length;
      const bRemaining = this.maxPenalties - bResults.length;

      if (aGoals > bGoals + bRemaining) {
        this.penaltyWinner = this.selectedTeamA!;
        this.endPenalties();
        return;
      }
      if (bGoals > aGoals + aRemaining) {
        this.penaltyWinner = this.selectedTeamB!;
        this.endPenalties();
        return;
      }

      if (aResults.length === this.maxPenalties && bResults.length === this.maxPenalties) {
        if (aGoals !== bGoals) {
          this.penaltyWinner = aGoals > bGoals ? this.selectedTeamA! : this.selectedTeamB!;
          this.endPenalties();
        } else {
          this.isSuddenDeath = true;
        }
        return;
      }
    } else {
      if (aResults.length > this.maxPenalties && bResults.length > this.maxPenalties && aResults.length === bResults.length) {
        const lastA = aResults[aResults.length - 1];
        const lastB = bResults[bResults.length - 1];
        if (lastA !== lastB) {
          this.penaltyWinner = lastA === '✅' ? this.selectedTeamA! : this.selectedTeamB!;
          this.penaltyShootoutActive = false;
          this.isPenaltyInProgress = false;
        }
      }
    }
  }

  endPenalties() {
    this.penaltyShootoutActive = false;
    this.isPenaltyInProgress = false;

    if (this.penaltyWinner && this.matchResult) {
      this.matchResult.penaltiesA = this.penaltyTurns[0].filter(r => r === '✅').length;
      this.matchResult.penaltiesB = this.penaltyTurns[1].filter(r => r === '✅').length;
    }
  }

  getPenaltySlots(teamIndex: number): ('✅' | '❌' | '⬜')[] {
    const actual = this.penaltyTurns[teamIndex];
    const size = Math.max(this.maxPenalties, actual.length);
    return Array.from({ length: size }, (_, idx) => actual[idx] || '⬜');
  }

  isInteractionBlocked(): boolean {
    return this.isMatchPlayed || this.penaltyShootoutActive;
  }

  resetMatch() {
    this.selectedTeamA = undefined;
    this.selectedTeamB = undefined;
    this.typeA = null;
    this.typeB = null;
    this.filterAConfLeague = null;
    this.filterBConfLeague = null;

    this.matchResult = undefined;
    this.isMatchPlayed = false;
    this.penaltyShootoutActive = false;
    this.isPenaltyInProgress = false;
    this.penaltyVisible = false;
    this.penaltyWinner = null;
    this.penaltyTurns = [[], []];
    this.isSuddenDeath = false;
  }
}
