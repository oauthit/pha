'use strict';

describe('Controller: AuthorizedCtrl', function () {

  // load the controller's module
  beforeEach(module('phaApp'));

  var AuthorizedCtrl, scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    AuthorizedCtrl = $controller('AuthorizedCtrl', {
      $scope: scope
    });
  }));

  it('should ...', function () {
    expect(1).toEqual(1);
  });
});
