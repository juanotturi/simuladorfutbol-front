import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Team } from '../../models/team.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NavigationService } from '../../services/navigation.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-teams-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teams-list.component.html',
  styleUrls: ['./teams-list.component.scss']
})
export class TeamsListComponent implements OnInit, OnDestroy {
  apiBaseUrl = environment.apiBaseUrl;
  assetsBaseUrl = environment.assetsBaseUrl;
  teams: Team[] = [];
  isLoading = false;
  private subscription?: Subscription;

  selectedTab: 'SELECCIONES' | 'CLUBES' | '' = '';

  selectedConfederation: string = '';
  selectedLeague: string = '';
  searchName: string = '';
  sortField: 'name' | 'score' = 'score';
  sortDirection: 'asc' | 'desc' = 'desc';
  uniqueConfederations: string[] = [];
  uniqueLeagues: string[] = [];

  constructor(
    private apiService: ApiService,
    private navigationService: NavigationService
  ) { }

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
