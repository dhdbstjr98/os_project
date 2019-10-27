$(function() {
	function getInputs() {
		var periodicRandom = $("#is-periodic-random").is(":checked");
		var aperiodicRandom = $("#is-aperiodic-random").is(":checked");
		var periodic = new Array();
		var aperiodic = new Array();

		if(periodicRandom) {

		} else {
			var input = $("#periodic-list").val();
			var rows = input.split("\n");
			for(i in rows) {
				var row = rows[i].trim().split(" ");

				if(row.length != 2)
					return null;

				periodic.push({
					t:parseInt(row[0]),
					c:parseInt(row[1])
				});
			}
		}

		if(aperiodicRandom) {

		} else {
			var input = $("#aperiodic-list").val();
			var rows = input.split("\n");
			for(i in rows) {
				var row = rows[i].trim().split(" ");

				if(row.length != 2)
					return null;

				aperiodic.push({
					a:parseInt(row[0]),
					c:parseInt(row[1])
				});
			}
		}

		var server = {
			t:parseInt($("#server-t").val()),
			c:parseInt($("#server-c").val())
		}

		return {
			periodic:periodic,
			aperiodic:aperiodic,
			server:server
		};
	}

	function isPossible(periodic, server) {
		if(server.t <= 0)
			return false;

		utilization = server.c / server.t;

		for(i in periodic) {
			if(periodic[i].t <= 0)
				return false;
			utilization += periodic[i].c / periodic[i].t;
		}
		
		maxUtilization = periodic.length * (Math.pow(2, 1/(periodic.length)) - 1)

		return utilization <= maxUtilization;
	}

	function lcm(input_array) {
		if (toString.call(input_array) !== "[object Array]")  
			return  false;  
		var r1 = 0, r2 = 0;
		var l = input_array.length;
		for(i=0;i<l;i++) {
			r1 = input_array[i] % input_array[i + 1];
			if(r1 === 0) {
				input_array[i + 1] = (input_array[i] * input_array[i+1]) / input_array[i + 1];
			} else {
				r2 = input_array[i + 1] % r1;
				if(r2 === 0) {
					input_array[i + 1] = (input_array[i] * input_array[i + 1]) / r1;
				} else {
					input_array[i+1] = (input_array[i] * input_array[i + 1]) / r2;
				}
			}
		}
		return input_array[l - 1];
	}

	function getHyperPeriod(periodic, server) {
		periods = new Array();
		periods.push(server.t);
		
		for(i in periodic) {
			periods.push(periodic[i].t);
		}

		return lcm(periods);
	}

	function sortPeriodic(periodic) {
		if(periodic.length < 2)
			return periodic;

		for(var i=1; i<periodic.length; i++) {
			for(var j=i; j<periodic.length; j++) {
				if(periodic[j-1].t > periodic[j].t) {
					var tmp = periodic[j-1];
					periodic[j-1] = periodic[j];
					periodic[j] = tmp;
				}
			}
		}

		return periodic
	}

	function sortAperiodic(aperiodic) {
		if(aperiodic.length < 2)
			return aperiodic;

		for(var i=1; i<aperiodic.length; i++) {
			for(var j=i; j<aperiodic.length; j++) {
				if(aperiodic[j-1].a > aperiodic[j].a) {
					var tmp = aperiodic[j-1];
					aperiodic[j-1] = aperiodic[j];
					aperiodic[j] = tmp;
				}
			}
		}

		return aperiodic
	}

	function getPolling(inputs) {
		var hyperPeriod = getHyperPeriod(inputs.periodic, inputs.server);
		var periodic = sortPeriodic(inputs.periodic);
		var aperiodic = sortAperiodic(inputs.aperiodic);
		var usingTask = -1;
		var avgAperiodicWaitingTime = 0;
		var serverRemain = 0;
		var tasks = new Array();

		for(i in aperiodic) {
			aperiodic[i].remain = aperiodic[i].c;
		}

		for(t=0; t<hyperPeriod; t++) {
			for(i in periodic) {
				if(t % periodic[i].t == 0) {
					periodic[i].remain = periodic[i].c;
				}
			}

			if(t % inputs.server.t == 0) {
				usingTask = -2;	// AP
				serverRemain = inputs.server.c;
			}
			
			if(usingTask == -2) {
				var continueTask = false;
				for(j in aperiodic) {
					if(t >= aperiodic[j].a && aperiodic[j].remain > 0) {
						if(--aperiodic[j].remain == 0)
							aperiodic[j].finished = t + 1;
						tasks.push('AP' + j);
						continueTask = true;
						break;
					}
				}
				if(--serverRemain == 0)
					usingTask = -1;
				if(continueTask)
					continue;
			}
			
			for(i in periodic) {
				if(periodic[i].remain > 0) {
					usingTask = parseInt(i)
					break;
				}
			}

			if(usingTask != -1) {
				tasks.push('P' + usingTask);
				if(--periodic[usingTask].remain == 0)
					usingTask = -1;
			} else {
				tasks.push('');
			}
		}

		for(i in aperiodic) {
			if(aperiodic[i].finished == undefined) {
				avgAperiodicWaitingTime = '모든 비주기적 Task가 완료되지 않음';
				break;
			} else {
				avgAperiodicWaitingTime += aperiodic[i].finished - aperiodic[i].a - aperiodic[i].c;
			}
		}
		
		if(!isNaN(avgAperiodicWaitingTime))
			avgAperiodicWaitingTime /= aperiodic.length;

		return {
			tasks:tasks,
			avgAperiodicWaitingTime:avgAperiodicWaitingTime
		};
	}

	function getDeferrable(inputs) {
		var hyperPeriod = getHyperPeriod(inputs.periodic, inputs.server);
		var periodic = sortPeriodic(inputs.periodic);
		var aperiodic = sortAperiodic(inputs.aperiodic);
		var usingTask = -1;
		var avgAperiodicWaitingTime = 0;
		var serverRemain = 0;
		var tasks = new Array();

		for(i in aperiodic) {
			aperiodic[i].remain = aperiodic[i].c;
		}

		for(t=0; t<hyperPeriod; t++) {
			for(i in periodic) {
				if(t % periodic[i].t == 0) {
					periodic[i].remain = periodic[i].c;
				}
			}

			if(t % inputs.server.t == 0) {
				serverRemain = inputs.server.c;
			}
			
			if(serverRemain > 0) {
				var continueTask = false;
				for(j in aperiodic) {
					if(t >= aperiodic[j].a && aperiodic[j].remain > 0) {
						if(--aperiodic[j].remain == 0)
							aperiodic[j].finished = t + 1;
						tasks.push('AP' + j);
						continueTask = true;
						serverRemain--;
						break;
					}
				}
				if(continueTask)
					continue;
			}
			
			for(i in periodic) {
				if(periodic[i].remain > 0) {
					usingTask = parseInt(i)
					break;
				}
			}

			if(usingTask != -1) {
				tasks.push('P' + usingTask);
				if(--periodic[usingTask].remain == 0)
					usingTask = -1;
			} else {
				tasks.push('');
			}
		}

		for(i in aperiodic) {
			if(aperiodic[i].finished == undefined) {
				avgAperiodicWaitingTime = '모든 비주기적 Task가 완료되지 않음';
				break;
			} else {
				avgAperiodicWaitingTime += aperiodic[i].finished - aperiodic[i].a - aperiodic[i].c;
			}
		}
		
		if(!isNaN(avgAperiodicWaitingTime))
			avgAperiodicWaitingTime /= aperiodic.length;

		return {
			tasks:tasks,
			avgAperiodicWaitingTime:avgAperiodicWaitingTime
		};
	}

	function showTable(tasks) {
		$("table .process td").remove();
		$("table .time td").remove();

		var colspanTasks = new Array();
		var remainTask = '';
		var remainTaskSize = 0;

		for(i in tasks) {
			if(tasks[i] == remainTask)
				remainTaskSize++;
			else {
				if(i != 0) {
					colspanTasks.push({
						task:remainTask,
						colspan:remainTaskSize
					});
				}
				remainTask = tasks[i];
				remainTaskSize = 1;
			}
			$("table .time").append("<td>" + i + "</td>");
		}

		colspanTasks.push({
			task:remainTask,
			colspan:remainTaskSize
		});

		for(i in colspanTasks) {
			$("table .process").append("<td colspan='" + colspanTasks[i].colspan + "'>" + colspanTasks[i].task + "</td>");
		}
	}

	function showAvgAperiodicWaitingTime(avgAperiodicWaitingTime) {
		$("#avg-aperiodic-waiting-time").text(avgAperiodicWaitingTime);
	}

	$("#btn-polling").on("click", function() {
		inputs = getInputs();
		
		if(inputs === null) {
			alert("입력에 오류가 있습니다.");
			return;
		}
		
		if(isPossible(inputs.periodic, inputs.server)) {
			var result = getPolling(inputs);
			showTable(result.tasks);
			showAvgAperiodicWaitingTime(result.avgAperiodicWaitingTime);
		} else {
			alert("주기가 올바르지 않거나 마감시간 내에 종료할 수 없을 가능성이 있습니다.");
		}
	});

	$("#btn-deferrable").on("click", function() {
		inputs = getInputs();
		
		if(inputs === null) {
			alert("입력에 오류가 있습니다.");
			return;
		}
		
		if(isPossible(inputs.periodic, inputs.server)) {
			var result = getDeferrable(inputs);
			showTable(result.tasks);
			showAvgAperiodicWaitingTime(result.avgAperiodicWaitingTime);
		} else {
			alert("주기가 올바르지 않거나 마감시간 내에 종료할 수 없을 가능성이 있습니다.");
		}
	});
});