$(function() {
	function getInputs() {
		var periodicRandom = $("#is-periodic-random").is(":checked");
		var aperiodicRandom = $("#is-aperiodic-random").is(":checked");
		var periodic = new Array();
		var aperiodic = new Array();

		var server = {
			t:parseInt($("#server-t").val()),
			c:parseInt($("#server-c").val())
		}

		if(periodicRandom) {
			var randomCount = 3 + parseInt(Math.random() * 3);
			var periodicTmp = new Array();
			for(var i=0; i<randomCount; i++) {
				var c = 1 + parseInt(Math.random() * 7);
				var t = 60;
				if(Math.random() > 0.5) {
					var tcGCD = gcd(60, c);
					t /= tcGCD;
					c /= tcGCD;
				}

				periodicTmp.push({
					t:t,
					c:c
				});
			}
			showPeriodic(periodicTmp);
		}

		var periodicInput = $("#periodic-list").val().trim();
		var rows = periodicInput.split("\n");

		if(rows.length < 1 || rows.length > 100) {
			alert("주기적 task의 갯수는 1~100개만 가능합니다.");
			return null;
		}

		for(var i in rows) {
			var row = rows[i].trim().split(" ");

			if(row.length != 2)
				return null;

			periodic.push({
				t:parseInt(row[0]),
				c:parseInt(row[1])
			});
		}

		if(aperiodicRandom) {
			var aperiodicTmp = new Array();
			var hyperPeriod = getHyperPeriod(periodic, server);
			var randomCount = 1 + parseInt(Math.random() * parseInt(hyperPeriod/server.t));
			for(var i=0; i<randomCount; i++) {
				var a = 1 + parseInt(Math.random() * parseInt(hyperPeriod/3));
				var c = 1;
				if(Math.random() > 0.8)
					c += 1
				
				aperiodicTmp.push({
					a:a,
					c:c
				});
			}
			showAperiodic(aperiodicTmp);
		}

		var aperiodicInput = $("#aperiodic-list").val().trim();
		var rows = aperiodicInput.split("\n");
		for(var i in rows) {
			var row = rows[i].trim().split(" ");

			if(row.length != 2)
				return null;

			aperiodic.push({
				a:parseInt(row[0]),
				c:parseInt(row[1])
			});
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

		for(var i in periodic) {
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

	function gcd(value1, value2) {
		if (typeof value1 !== "number" || typeof value2 !== "number")
			return;

		var num = value1 > value2 ? value1 : value2;
		var max;
		
		for (let i = 1; i <= num; i++) {
			if (value1 % i === 0 && value2 % i === 0)
				max = i;
		}
		
		return max;
	}

	function getHyperPeriod(periodic, server) {
		periods = new Array();
		periods.push(server.t);
		
		for(var i in periodic) {
			periods.push(periodic[i].t);
		}

		return lcm(periods);
	}

	function sortPeriodic(periodic) {
		if(periodic.length < 2)
			return periodic;

		for(var i=1; i<periodic.length; i++) {
			for(var j=1; j<periodic.length; j++) {
				if(periodic[j-1].t > periodic[j].t) {
					var tmp = periodic[j-1];
					periodic[j-1] = periodic[j];
					periodic[j] = tmp;
				}
			}
		}

		showPeriodic(periodic);

		return periodic
	}

	function sortAperiodic(aperiodic) {
		if(aperiodic.length < 2)
			return aperiodic;

		for(var i=1; i<aperiodic.length; i++) {
			for(var j=1; j<aperiodic.length; j++) {
				if(aperiodic[j-1].a > aperiodic[j].a) {
					var tmp = aperiodic[j-1];
					aperiodic[j-1] = aperiodic[j];
					aperiodic[j] = tmp;
				}
			}
		}

		showAperiodic(aperiodic);

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

		for(var i in aperiodic) {
			aperiodic[i].remain = aperiodic[i].c;
		}

		for(t=0; t<hyperPeriod; t++) {
			for(var i in periodic) {
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
				for(var j in aperiodic) {
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
			
			for(var i in periodic) {
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

		for(var i in aperiodic) {
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

		for(var i in aperiodic) {
			aperiodic[i].remain = aperiodic[i].c;
		}

		for(t=0; t<hyperPeriod; t++) {
			for(var i in periodic) {
				if(t % periodic[i].t == 0) {
					periodic[i].remain = periodic[i].c;
				}
			}

			if(t % inputs.server.t == 0) {
				serverRemain = inputs.server.c;
			}
			
			if(serverRemain > 0) {
				var continueTask = false;
				for(var j in aperiodic) {
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
			
			for(var i in periodic) {
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

		for(var i in aperiodic) {
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

	function showPeriodic(periodic) {
		var periodicText = '';
		for(var i in periodic) {
			periodicText += (periodic[i].t + ' ' + periodic[i].c + '\n');
		}
		$("#periodic-list").val(periodicText.trim());
	}

	function showAperiodic(aperiodic) {
		var aperiodicText = '';
		for(var i in aperiodic) {
			aperiodicText += (aperiodic[i].a + ' ' + aperiodic[i].c + '\n');
		}
		$("#aperiodic-list").val(aperiodicText.trim());
	}

	function showTable(tasks) {
		$("table .process td").remove();
		$("table .time td").remove();

		var colspanTasks = new Array();
		var remainTask = '';
		var remainTaskSize = 0;

		for(var i in tasks) {
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

		for(var i in colspanTasks) {
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