import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Team } from '../../models/team.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teams-list.component.html',
  styleUrls: ['./teams-list.component.scss']
})
export class TeamsListComponent implements OnInit, OnDestroy {

  teams: Team[] = [];
  isLoading = false;
  private subscription?: Subscription;

  selectedTab: 'SELECCIONES' | 'CLUBES' | '' = '';

  selectedConfederation: string = '';
  selectedLeague: string = '';
  searchName: string = '';
  sortField: 'name' | 'score' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  uniqueConfederations: string[] = [];
  uniqueLeagues: string[] = [];

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
        this.extractUniqueFilters(data); // 👈 Nueva línea
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

  get filteredTeams(): Team[] {
    let subset = this.teams;

    if (this.selectedTab === 'SELECCIONES') {
      subset = subset.filter(t => t.league === null);
    } else if (this.selectedTab === 'CLUBES') {
      subset = subset.filter(t => t.league !== null);
    }

    if (this.selectedTab === 'SELECCIONES' && this.selectedConfederation) {
      subset = subset.filter(t => t.confederation === this.selectedConfederation);
    }

    if (this.selectedTab === 'CLUBES' && this.selectedLeague) {
      subset = subset.filter(t => t.league === this.selectedLeague);
    }

    if (this.searchName) {
      subset = subset.filter(t =>
        t.name.toLowerCase().includes(this.searchName.toLowerCase())
      );
    }

    subset = subset.slice();

    if (this.sortField === 'name') {
      subset.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const comparison = aName.localeCompare(bName, undefined, { sensitivity: 'base' });
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    } else if (this.sortField === 'score') {
      subset.sort((a, b) => {
        return this.sortDirection === 'asc'
          ? a.score - b.score
          : b.score - a.score;
      });
    }

    return subset;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
