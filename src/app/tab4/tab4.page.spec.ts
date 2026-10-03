import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Tab4Page } from './tab4.page';

describe('Tab4Page', () => {
  let component: Tab4Page;
  let fixture: ComponentFixture<Tab4Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Tab4Page],
      imports: [FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Tab4Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve separar as metas em categorias corretamente', () => {
    component.metas = [
      { nome: 'Meta 1', valor_meta: 1000, data_alvo: '2026-12-31', concluida: false, favorita: false },
      { nome: 'Meta 2', valor_meta: 500, data_alvo: '2026-06-01', concluida: false, favorita: true },
      { nome: 'Meta 3', valor_meta: 200, data_alvo: '2026-01-01', concluida: true, favorita: false }
    ];

    expect(component.metasFavoritas.length).toBe(1);
    expect(component.metasOutras.length).toBe(1);
    expect(component.metasConcluidas.length).toBe(1);
  });
});