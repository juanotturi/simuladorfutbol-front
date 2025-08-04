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
  assetsBaseUrl = environment.assetsBaseUrl;
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
  penaltyPlayersByTeam = new Map<number, { name: string }[]>();
  allPlayersByTeam = new Map<number, { name: string, position: string }[]>();

  placeholderImage = '/assets/placeholder_pelota.png';

  penaltyShootoutActive = false;
  penaltyVisible = false;
  penaltyTurns: ('✅' | '❌')[][] = [[], []];
  currentShooter: 0 | 1 = 0;
  lastShooter: string = "";
  penaltyWinner: Team | null = null;
  maxPenalties: number = 5;
  isSuddenDeath = false;
  isPenaltyInProgress = false;
  penaltyShootoutLog: string[] = [];

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
      const mA = a.match(/\(([^)]+)\)/);
      const mB = b.match(/\(([^)]+)\)/);

      const hasA = !!mA;
      const hasB = !!mB;

      if (hasA && !hasB) return -1;
      if (!hasA && hasB) return 1;

      if (!hasA && !hasB) return a.localeCompare(b, 'es');

      const [countryA, levelAStr = '999'] = mA![1].split(' ');
      const [countryB, levelBStr = '999'] = mB![1].split(' ');

      const byCountry = countryA.localeCompare(countryB, 'es');
      if (byCountry !== 0) return byCountry;

      const levelA = parseInt(levelAStr, 10);
      const levelB = parseInt(levelBStr, 10);
      return (isNaN(levelA) ? 999 : levelA) - (isNaN(levelB) ? 999 : levelB);
    });
  }

  getSecondLevelOptions(type: 'SELECCION' | 'CLUB' | null): string[] {
    if (type === 'SELECCION') return this.uniqueConfederations;
    if (type === 'CLUB') return this.uniqueLeagues;
    return [];
  }

  getCurrentPenaltyShooter(): string {
    const team = this.currentShooter === 0 ? this.selectedTeamA : this.selectedTeamB;
    const teamId = team?.id;
    const teamCode = team?.code;
    const teamName = team?.name ?? 'Equipo';

    if (!teamId) return teamName;

    const shooters = this.penaltyPlayersByTeam.get(teamId);

    if (!shooters || shooters.length === 0) {
      return teamName;
    }

    const shotsTaken = this.penaltyTurns[this.currentShooter].length;
    const shooter = shooters[shotsTaken % shooters.length];
    this.lastShooter = shooter.name;
    return `${shooter.name}`;
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
      this.penaltyShootoutLog = [];
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
    this.penaltyPlayersByTeam.clear();
    this.penaltyShootoutLog = [];
    this.allPlayersByTeam.clear();

    const idA = this.selectedTeamA?.id;
    const idB = this.selectedTeamB?.id;

    if (!idA || !idB) return;

    forkJoin({
      a: this.apiService.getPlayersByTeam(idA),
      b: this.apiService.getPlayersByTeam(idB)
    }).subscribe(({ a, b }) => {
      const orderedA = a.filter(p => p.penaltyOrder > 0).sort((x, y) => x.penaltyOrder - y.penaltyOrder);
      const orderedB = b.filter(p => p.penaltyOrder > 0).sort((x, y) => x.penaltyOrder - y.penaltyOrder);

      this.penaltyPlayersByTeam.set(idA, orderedA);
      this.penaltyPlayersByTeam.set(idB, orderedB);
      this.allPlayersByTeam.set(idA, a);
      this.allPlayersByTeam.set(idB, b);

      this.penaltyShootoutActive = true;
      this.isPenaltyInProgress = true;
      this.penaltyVisible = true;
      this.penaltyTurns = [[], []];
      this.penaltyWinner = null;
      this.isSuddenDeath = false;
      this.isMatchPlayed = false;

      this.currentShooter = Math.random() < 0.5 ? 0 : 1;
    });
  }

  takePenalty() {
    if (!this.penaltyShootoutActive || this.penaltyWinner) return;

    const roll = Math.floor(Math.random() * 10) + 1;
    const result: '✅' | '❌' = roll <= 7 ? '✅' : '❌';
    this.penaltyTurns[this.currentShooter].push(result);

    const team = this.currentShooter === 0 ? this.selectedTeamA : this.selectedTeamB;
    const teamName = team?.name ?? 'Equipo';

    const shooterName = this.lastShooter;
    const isGenericShooter = shooterName === teamName;
    const shooterPart = isGenericShooter ? '' : ` ${shooterName}`;

    if (result === '✅') {
      this.penaltyShootoutLog.push(`✅ ${teamName} ⚽${shooterPart}`);
    } else {
      const rival = this.currentShooter === 0 ? 1 : 0;
      const goalkeeperName = this.getGoalkeeperName(rival);
      switch (roll) {
        case 8:
          const hasGoalkeeper = goalkeeperName !== 'el arquero';
          const hasShooter = !isGenericShooter;

          let atajadaTexto = '';

          if (!hasGoalkeeper && !hasShooter) {
            atajadaTexto = 'Atajó el arquero';
          } else if (hasGoalkeeper && !hasShooter) {
            atajadaTexto = `Atajó ${goalkeeperName}`;
          } else if (!hasGoalkeeper && hasShooter) {
            atajadaTexto = `Atajó el arquero a ${shooterName}`;
          } else {
            atajadaTexto = `Atajó ${goalkeeperName} a ${shooterName}`;
          }

          this.penaltyShootoutLog.push(`❌ ${teamName} 🧤 ${atajadaTexto}`);
          break;
        case 9:
          const paloOrTravesanio = Math.random() < 0.5 ? 'Palo' : 'Travesaño';
          const paloTexto = isGenericShooter ? paloOrTravesanio : `${paloOrTravesanio} de ${shooterName}`;
          this.penaltyShootoutLog.push(`❌ ${teamName} 🥅 ${paloTexto}`);
          break;
        case 10:
          this.penaltyShootoutLog.push(`❌ ${teamName} 🎯 Afuera ${shooterPart}`);
          break;
      }
    }

    this.checkPenaltyWinner();

    if (!this.penaltyWinner) {
      this.currentShooter = this.currentShooter === 0 ? 1 : 0;
    }
  }

  getGoalkeeperName(teamIndex: 0 | 1): string {
    const team = teamIndex === 0 ? this.selectedTeamA : this.selectedTeamB;
    const teamId = team?.id;
    if (!teamId) return 'el arquero';

    const players = this.allPlayersByTeam.get(teamId);
    if (!players) return 'el arquero';

    const keeper = players.find(p => p.position === 'ARQ');
    return keeper?.name ?? 'el arquero';
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
    const current = this.penaltyTurns[teamIndex];
    const other = this.penaltyTurns[teamIndex === 0 ? 1 : 0];

    const maxBase = this.maxPenalties;
    const maxLength = Math.max(maxBase, current.length, other.length);

    return Array.from({ length: maxLength }, (_, idx) => current[idx] || '⬜');
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
    this.penaltyShootoutLog = [];
  }
}
