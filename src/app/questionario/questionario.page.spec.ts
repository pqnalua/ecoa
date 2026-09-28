import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuestionarioPage } from './questionario.page';

describe('QuestionarioPage', () => {
  let component: QuestionarioPage;
  let fixture: ComponentFixture<QuestionarioPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(QuestionarioPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
