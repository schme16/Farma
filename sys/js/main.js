angular.module('farma', [])

/*The master controller*/
.controller('master', ($scope, $sce, $compile) => {
	let m = $scope
	m.query = Qs.parse(location.search.substr(1))
	
	m.$root.page = m.query.page || 'menu'	
	
	
	
})