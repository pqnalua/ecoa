import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Tab4Page } from './tab4.page';

// Declaração dos tipos do Jasmine para evitar erros de compilação do TypeScript
declare var describe: any;
declare var beforeEach: any;
declare var it: any;
declare var expect: any;

describe('Tab4Page', () => {
  let component: Tab4Page;
  let fixture: ComponentFixture<Tab4Page>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [Tab4Page],
      imports: [FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(Tab4Page);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve favoritar e desfavoritar uma meta', () => {
    const metaFake = { nome: 'Meta Teste', valorMeta: 100, valorAtual: 0, favorita: false };
    component.favoritar(metaFake);
    expect(metaFake.favorita).toBe(true);

    component.favoritar(metaFake);
    expect(metaFake.favorita).toBe(false);
  });

  it('deve ordenar metas marcadas como favoritas no topo', () => {
    component.metas = [
      { nome: 'Meta 1', valorMeta: 100, valorAtual: 0, favorita: false },
      { nome: 'Meta 2', valorMeta: 200, valorAtual: 0, favorita: true }
    ];

    const ordenadas = component.metasOrdenadas;
    expect(ordenadas[0].nome).toBe('Meta 2');
  });
});