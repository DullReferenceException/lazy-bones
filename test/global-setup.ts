import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';

before(() => {
  chai.use(sinonChai);
  chai.use(chaiAsPromised);
});
