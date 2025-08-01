import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Team } from '../../models/team.model';
import { MatchResult } from '../../models/match-result.model';
import { forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-play-match',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './play-match.component.html',
  styleUrls: ['./play-match.component.scss']
})
export class PlayMatchComponent implements OnInit {
  apiBaseUrl = environment.apiBaseUrl;
  teams: Team[] = [];
  isLoading = false;
  matchResult?: MatchResult;
  goalTimelineA: number[] = [];
  goalTimelineB: number[] = [];
  liveGoalsA = 0;
  liveGoalsB = 0;
  goalLog: string[] = [];
  isMatchInProgress = false;
  isMatchPlayed = false;
  private teamHasPlayers = new Map<number, boolean>();
  lastTeamA: Team | null = null;
  lastTeamB: Team | null = null;
  lastTypeA: 'SELECCION' | 'CLUB' | null = null;
  lastTypeB: 'SELECCION' | 'CLUB' | null = null;
  lastConfA: string | null = null;
  lastConfB: string | null = null;

  placeholderImage = '/assets/placeholder_pelota.png';

  penaltyShootoutActive = false;
  penaltyVisible = false;
  penaltyTurns: ('✅' | '❌')[][] = [[], []];
  currentShooter: 0 | 1 = 0;
  penaltyWinner: Team | null = null;
  maxPenalties: number = 5;
  isSuddenDeath = false;
  isPenaltyInProgress = false;

  typeA: 'SELECCION' | 'CLUB' | null = null;
  filterAConfLeague: string | null = null;
  selectedTeamA?: Team;

  typeB: 'SELECCION' | 'CLUB' | null = null;
  filterBConfLeague: string | null = null;
  selectedTeamB?: Team;

  uniqueConfederations: string[] = [];
  uniqueLeagues: string[] = [];

  durations = [
    { label: 'Instantáneo', value: 0 },
    { label: '30 segundos', value: 30_000 },
    { label: '1 minuto', value: 60_000 },
    { label: '5 minutos', value: 300_000 },
    { label: '10 minutos', value: 600_000 }
  ];
  selectedDuration = 0;

  matchClock = 0;
  matchInterval: any;
  matchTimer: any = null;
  penaltyGoals: any;

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams() {
    this.isLoading = true;
    this.apiService.getTeams().subscribe({
      next: (data) => {
        this.teams = data;
        this.extractUniqueFilters(data);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading teams', err);
        this.isLoading = false;
      }
    });
  }

  extractUniqueFilters(teams: Team[]) {
    const confSet = new Set<string>();
    const leagueSet = new Set<string>();

    teams.forEach(team => {
      if (team.confederation) {
        confSet.add(team.confederation);
      }
      if (team.league) {
        leagueSet.add(team.league);
      }
    });

    this.uniqueConfederations = Array.from(confSet).sort();

    this.uniqueLeagues = Array.from(leagueSet).sort((a, b) => {
      const codeA = a.match(/\((.*?)\)/)?.[1] ?? '';
      const codeB = b.match(/\((.*?)\)/)?.[1] ?? '';

      const [countryA, levelA] = codeA.split(' ');
      const [countryB, levelB] = codeB.split(' ');

      if (countryA < countryB) return -1;
      if (countryA > countryB) return 1;

      return parseInt(levelA) - parseInt(levelB);
    });
  }

  getSecondLevelOptions(type: 'SELECCION' | 'CLUB' | null): string[] {
    if (type === 'SELECCION') return this.uniqueConfederations;
    if (type === 'CLUB') return this.uniqueLeagues;
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

    this.lastTeamA = this.selectedTeamA;
    this.lastTeamB = this.selectedTeamB;
    this.lastTypeA = this.typeA;
    this.lastTypeB = this.typeB;
    this.lastConfA = this.filterAConfLeague;
    this.lastConfB = this.filterBConfLeague;

    this.liveGoalsA = 0;
    this.liveGoalsB = 0;
    this.isMatchPlayed = false;
    this.matchResult = undefined;
    this.matchClock = 0;
    this.isMatchInProgress = true;
    this.goalLog = [];

    const idA = this.selectedTeamA.id;
    const idB = this.selectedTeamB.id;

    forkJoin({
      a: this.teamHasPlayers.has(idA) ? of(this.teamHasPlayers.get(idA)!) : this.apiService.hasPlayers(idA),
      b: this.teamHasPlayers.has(idB) ? of(this.teamHasPlayers.get(idB)!) : this.apiService.hasPlayers(idB),
    }).subscribe({
      next: ({ a, b }) => {
        this.teamHasPlayers.set(idA, !!a);
        this.teamHasPlayers.set(idB, !!b);

        this.apiService.getMatchResult(this.selectedTeamA!.score, this.selectedTeamB!.score).subscribe({
          next: (result) => {
            this.matchResult = result;
            this.generateGoalTimeline();
            this.startMatchClock();
          },
          error: () => { this.isLoading = false; }
        });
      },
      error: () => {
        this.teamHasPlayers.set(idA, false);
        this.teamHasPlayers.set(idB, false);
        this.apiService.getMatchResult(this.selectedTeamA!.score, this.selectedTeamB!.score).subscribe({
          next: (result) => {
            this.matchResult = result;
            this.generateGoalTimeline();
            this.startMatchClock();
          },
          error: () => { this.isLoading = false; }
        });
      }
    });
  }

  repeatMatch(): void {
    if (this.lastTeamA && this.lastTeamB && this.lastTypeA && this.lastTypeB) {
      this.typeA = this.lastTypeA;
      this.typeB = this.lastTypeB;
      this.filterAConfLeague = this.lastConfA;
      this.filterBConfLeague = this.lastConfB;
      this.selectedTeamA = this.lastTeamA;
      this.selectedTeamB = this.lastTeamB;
      this.liveGoalsA = 0;
      this.liveGoalsB = 0;
      this.matchResult = undefined;
      this.isMatchPlayed = false;
      this.penaltyShootoutActive = false;
      this.isPenaltyInProgress = false;
      this.penaltyVisible = false;
      this.penaltyWinner = null;
      this.penaltyTurns = [[], []];
      this.isSuddenDeath = false;
      this.matchClock = 0;
      this.goalLog = [];
      this.isMatchInProgress = false;
    }
  }

  generateGoalTimeline() {
    const goalsA = this.matchResult?.goalsTeamA ?? 0;
    const goalsB = this.matchResult?.goalsTeamB ?? 0;
    const totalGoals = goalsA + goalsB;

    if (totalGoals === 0) {
      this.goalTimelineA = [];
      this.goalTimelineB = [];
      return;
    }

    const minSeparation = 1;
    const availableMinutes = new Set<number>();

    for (let i = 1; i <= 90; i++) {
      availableMinutes.add(i);
    }

    const goalMinutes: number[] = [];

    while (goalMinutes.length < totalGoals && availableMinutes.size > 0) {
      const minutesArray = Array.from(availableMinutes);
      const randomIndex = Math.floor(Math.random() * minutesArray.length);
      const candidate = minutesArray[randomIndex];

      goalMinutes.push(candidate);

      for (let i = candidate - minSeparation; i <= candidate + minSeparation; i++) {
        availableMinutes.delete(i);
      }
    }

    goalMinutes.sort((a, b) => a - b);

    const shuffled = goalMinutes.sort(() => Math.random() - 0.5);
    this.goalTimelineA = shuffled.slice(0, goalsA).sort((a, b) => a - b);
    this.goalTimelineB = shuffled.slice(goalsA).sort((a, b) => a - b);
  }

  private pushGoalLog(team: Team, minute: number, side: 'A' | 'B') {
    const teamId = team.id;
    const has = this.teamHasPlayers.get(teamId) === true;

    if (!has) {
      this.goalLog.push(`⚽ Gol de ${team.name} (${minute}')`);
      return;
    }

    this.apiService.getRandomScorer(teamId).subscribe({
      next: (author) => {
        const authorText = author ? ` — ${author.name}` : '';
        this.goalLog.push(`⚽ Gol de ${team.name} ${authorText} (${minute}')`);
      },
      error: () => {
        this.goalLog.push(`⚽ Gol de ${team.name} (${minute}')`);
      }
    });
  }

  startMatchClock() {
    const duration = this.selectedDuration;
    const intervalTime = duration / 90;
    let minute = 0;

    this.matchTimer = setInterval(() => {
      minute++;
      this.matchClock = minute;

      if (this.goalTimelineA.includes(minute) && this.selectedTeamA) {
        this.liveGoalsA++;
        this.pushGoalLog(this.selectedTeamA, minute, 'A');
      }

      if (this.goalTimelineB.includes(minute) && this.selectedTeamB) {
        this.liveGoalsB++;
        this.pushGoalLog(this.selectedTeamB, minute, 'B');
      }

      if (minute >= 90) {
        clearInterval(this.matchTimer);
        this.isMatchPlayed = true;
      }
    }, intervalTime);
  }

  getMatchDurationInSeconds(): number {
    return this.selectedDuration / 1000;
  }

  fetchMatchResult() {
    this.isLoading = true;
    this.apiService.getMatchResult(this.selectedTeamA!.score, this.selectedTeamB!.score).subscribe({
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

  get penaltiesA(): number {
    return this.penaltyVisible ? this.penaltyTurns[0].filter(r => r === '✅').length : (this.matchResult?.penaltiesA ?? 0);
  }

  get penaltiesB(): number {
    return this.penaltyVisible ? this.penaltyTurns[1].filter(r => r === '✅').length : (this.matchResult?.penaltiesB ?? 0);
  }

  isInteractionBlocked(): boolean {
    return this.isMatchPlayed || this.penaltyShootoutActive || this.penaltyWinner != null || this.isMatchInProgress;
  }

  private pickRandom(pool: Team[], excludeId?: number): Team | undefined {
    if (!pool.length) return undefined;
    if (excludeId == null) {
      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx];
    }
    let candidate: Team | undefined;
    let tries = 0;
    do {
      const idx = Math.floor(Math.random() * pool.length);
      candidate = pool[idx];
      tries++;
    } while (candidate && candidate.id === excludeId && tries < 50);
    return candidate;
  }

  private applyTeamToSide(side: 'A' | 'B', team: Team): void {
    const type = team.league ? 'CLUB' as const : 'SELECCION' as const;
    const secondLevel = team.league ?? team.confederation ?? null;

    if (side === 'A') {
      this.typeA = type;
      this.filterAConfLeague = secondLevel;
      this.selectedTeamA = team;
    } else {
      this.typeB = type;
      this.filterBConfLeague = secondLevel;
      this.selectedTeamB = team;
    }
  }

  randomTeam(side: 'A' | 'B', scope: 'all' | 'filters' = 'all'): void {
    if (this.isInteractionBlocked() || !this.teams?.length) return;

    let pool: Team[] = [];
    if (scope === 'all') {
      pool = this.teams;
    } else {
      pool = side === 'A' ? this.filteredTeamsA : this.filteredTeamsB;
    }

    const otherId = side === 'A' ? this.selectedTeamB?.id : this.selectedTeamA?.id;
    const chosen = this.pickRandom(pool, otherId);

    if (chosen) {
      this.applyTeamToSide(side, chosen);
    }
  }

  private randomFromArray<T>(arr: T[]): T | undefined {
    if (!arr || arr.length === 0) return undefined;
    const idx = Math.floor(Math.random() * arr.length);
    return arr[idx];
  }

  private getFiltered(side: 'A' | 'B'): Team[] {
    return side === 'A' ? this.filteredTeamsA : this.filteredTeamsB;
  }

  randomNext(side: 'A' | 'B'): void {
    if (this.isInteractionBlocked()) return;

    if (side === 'A') {
      if (!this.typeA) {
        this.typeA = Math.random() < 0.5 ? 'SELECCION' : 'CLUB';
        return;
      }

      if (!this.filterAConfLeague) {
        const opts = this.getSecondLevelOptions(this.typeA);
        this.filterAConfLeague = this.randomFromArray(opts) ?? null;
        return;
      }

      const otherId = this.selectedTeamB?.id;
      if (!this.selectedTeamA) {
        let pool = this.getFiltered('A');
        if (otherId != null) pool = pool.filter(t => t.id !== otherId);
        if (pool.length === 0) pool = this.getFiltered('A');
        const chosen = this.randomFromArray(pool);
        if (chosen) this.selectedTeamA = chosen;
        return;
      }

      let pool = this.getFiltered('A').filter(t => t.id !== this.selectedTeamA!.id);
      if (otherId != null) pool = pool.filter(t => t.id !== otherId);
      if (pool.length === 0) pool = this.getFiltered('A');
      const reroll = this.randomFromArray(pool);
      if (reroll) this.selectedTeamA = reroll;
      return;
    }

    if (!this.typeB) {
      this.typeB = Math.random() < 0.5 ? 'SELECCION' : 'CLUB';
      return;
    }

    if (!this.filterBConfLeague) {
      const opts = this.getSecondLevelOptions(this.typeB);
      this.filterBConfLeague = this.randomFromArray(opts) ?? null;
      return;
    }

    const otherId = this.selectedTeamA?.id;
    if (!this.selectedTeamB) {
      let pool = this.getFiltered('B');
      if (otherId != null) pool = pool.filter(t => t.id !== otherId);
      if (pool.length === 0) pool = this.getFiltered('B');
      const chosen = this.randomFromArray(pool);
      if (chosen) this.selectedTeamB = chosen;
      return;
    }

    let pool = this.getFiltered('B').filter(t => t.id !== this.selectedTeamB!.id);
    if (otherId != null) pool = pool.filter(t => t.id !== otherId);
    if (pool.length === 0) pool = this.getFiltered('B');
    const reroll = this.randomFromArray(pool);
    if (reroll) this.selectedTeamB = reroll;
  }

  resetMatch() {
    this.selectedTeamA = undefined;
    this.selectedTeamB = undefined;
    this.typeA = null;
    this.typeB = null;
    this.filterAConfLeague = null;
    this.filterBConfLeague = null;
    this.liveGoalsA = 0;
    this.liveGoalsB = 0;
    this.matchResult = undefined;
    this.isMatchPlayed = false;
    this.penaltyShootoutActive = false;
    this.isPenaltyInProgress = false;
    this.penaltyVisible = false;
    this.penaltyWinner = null;
    this.penaltyTurns = [[], []];
    this.isSuddenDeath = false;
    this.matchClock = 0;
    this.goalLog = [];
    this.isMatchInProgress = false;
  }
}
