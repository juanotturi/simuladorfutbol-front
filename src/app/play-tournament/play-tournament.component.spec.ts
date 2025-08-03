import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayTournamentComponent } from './play-tournament.component';

describe('PlayTournamentComponent', () => {
  let component: PlayTournamentComponent;
  let fixture: ComponentFixture<PlayTournamentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayTournamentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayTournamentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
