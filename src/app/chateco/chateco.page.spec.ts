import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatecoPage } from './chateco.page';

describe('ChatecoPage', () => {
  let component: ChatecoPage;
  let fixture: ComponentFixture<ChatecoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatecoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
