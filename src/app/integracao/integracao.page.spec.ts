import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IntegracaoPage } from './integracao.page';

describe('IntegracaoPage', () => {
  let component: IntegracaoPage;
  let fixture: ComponentFixture<IntegracaoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IntegracaoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
