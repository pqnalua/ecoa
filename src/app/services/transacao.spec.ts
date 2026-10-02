import { TestBed } from '@angular/core/testing';

import { TransacaoService } from './transacao';

describe('TransacaoService', () => {
  let service: TransacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransacaoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});