
import { of } from 'rxjs';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { RequestsApiService } from './services/requests-api.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: RequestsApiService,
          useValue: {
            list: jasmine.createSpy('list').and.returnValue(
              of({
                items: [],
                total: 0,
                page: 1,
                totalPages: 0,
              }),
            ),
            getById: jasmine.createSpy('getById'),
            transition: jasmine.createSpy('transition'),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the application title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Gestión de solicitudes',
    );
  });
});
