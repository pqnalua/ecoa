import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanosPage } from './planos.page';

describe('PlanosPage', () => {
  let component: PlanosPage;
  let fixture: ComponentFixture<PlanosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
