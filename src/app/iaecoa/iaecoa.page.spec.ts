import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IaecoaPage } from './iaecoa.page';

describe('IaecoaPage', () => {
  let component: IaecoaPage;
  let fixture: ComponentFixture<IaecoaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(IaecoaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
