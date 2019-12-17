$(function() {
	var hashQueue = [];
	var freeList = [];		// linked list와 퍼포먼스 차이가 크지 않을 것 같아서 그냥 리스트로 작성함.
	var hashResultCount = 10;
	var maxSize = 100;
	var emptyReadyQueue = [];
	var busyReadyQueue = [];
	var processCount = 1;

	function initialize() {
		var freeListCount = parseInt($("#free-list-count").val());
		processCount = parseInt($("#process-count").val());

		if(processCount > 99)
			processCount = 99;
		else if(processCount < 4)
			processCount = 4;

		if(freeListCount > maxSize)
			freeListCount = maxSize;

		for(var i=0; i<hashResultCount; i++) {
			hashQueue.push([]);
		}
		
		var randomData = [];
		for(var i=1; i<=maxSize * 2; i++) {
			randomData.push(i);
		}

		randomData = randomData.sort(function() { return 0.5 - Math.random(); });
		for(var i=0; i<maxSize; i++) {
			addNode(randomData[i]);
		}

		for(var i=0; i<freeListCount; i++) {
			makeFree(randomData[i]);
		}
	}

	function hash(index) {
		return index % hashResultCount;
	}

	function getNode(index) {
		return hashQueue[hash(index)].find(function(node) { return node.index == index });
	}

	function addNode(index) {
		var node = {index:index, isDelayedWrite:false, isBusy:false};
		hashQueue[hash(index)].push(node);
		return node;
	}

	function removeNode(index) {
		freeList.splice(freeList.indexOf(index), 1);
		hashQueue[hash(index)].splice(hashQueue[hash(index)].indexOf(getNode(index)), 1);
		var nodeAdded = emptyReadyQueue.splice(0, 1);
		if(nodeAdded.length > 0) {
			addNode(nodeAdded[0])	// 시나리오4에 해당하는 데이터에 대한 signal
			showTextResult("free list empty가 해제되어 이전에 사용한 getBuffer에서 wait가 풀림 (해당 노드가 추가됨)");
		}
	}

	function isFree(index) {
		return freeList.indexOf(index) >= 0;
	}

	function makeFree(index) {
		var freePosition = freeList.indexOf(index);
		if(freePosition < 0)
			freeList.push(index);
	}

	function makeUnfree(index) {
		var freePosition = freeList.indexOf(index);
		if(freePosition >= 0)
			freeList.splice(freePosition, 1);
	}

	function makeBusy(index) {
		var node = getNode(index);
		if(node != undefined)
			node.isBusy = true;
	}

	function makeUnbusy(index) {
		var node = getNode(index);
		if(node != undefined)
			node.isBusy = false;
		
		var busyIndex = busyReadyQueue.indexOf(index);
		if(busyIndex >= 0) {
			busyReadyQueue.splice(busyIndex, 1);
			showTextResult(index + "에 대한 busy가 해제되어 이전에 사용한 getBuffer에서 wait가 풀림");		// 시나리오2에 해당하는 데이터에 대한 signal
		}
	}

	function makeDelayedWrite(index) {
		var node = getNode(index);
		if(node != undefined)
			node.isDelayedWrite = true;
	}

	function makeUndelayedWrite(index) {
		var node = getNode(index);
		if(node != undefined)
			node.isDelayedWrite = false;
	}

	function getBuffer(index) {
		var node = getNode(index);
		if(node != undefined) {
			if(node.isBusy) {
				// 시나리오5 : busy인 경우
				busyReadyQueue.push(index);
				showTextResult("시나리오5 : busy이므로 wait");
				return -1;
			}
			
			// 시나리오1 : 일반적인 경우
			makeUnfree(node.index);
			showTextResult("시나리오1 : 해당 buffer를 가져옴");
			return node;
		}

		if(freeList.length == 0) {
			// 시나리오4 : 빈 공간이 없는 경우
			emptyReadyQueue.push(index);
			showTextResult("시나리오4 : free list empty이므로 wait");
			return -2;
		}

		for(var i=0; i<freeList.length; i++) {
			var node = getNode(freeList[i]);
			if(node.isDelayedWrite) {
				// 시나리오3 : delayed write인 경우
				showTextResult("시나리오3 : delayed write이므로 다음 free node로 이동");
				continue;
			}

			// 시나리오2 : free 버퍼를 찾은 경우
			removeNode(freeList[i]);
			showTextResult("시나리오2 : free리스트에서 한 버퍼를 제거한 후 새로운 버퍼를 hash queue에 할당");
			return addNode(index);
		}
	}

	function processAction(type, fixedIndex=null) {
		var possibleAction;
		var setFixedIndex = null;
		var delay = 1000 + parseInt(Math.random() * 9000);

		switch(type) {
		case 1:
			// getBuffer
			var index = 1 + parseInt(Math.random() * 200);
			getBuffer(index);
			possibleAction = [1,2,3,4];
			break;

		case 2:
			// make busy
			var index = 1 + parseInt(Math.random() * 200);
			if(getNode(index) != undefined) {
				makeBusy(index);
				possibleAction = [5];
				setFixedIndex = index;
			} else {
				possibleAction = [2];
				delay = 0;
			}
			break;

		case 3:
			// make free
			var index = 1 + parseInt(Math.random() * 200);
			if(getNode(index) != undefined) {
				makeFree(index);
				possibleAction = [1,2,3,4];
			} else {
				possibleAction = [3];
				delay = 0;
			}
			break;

		case 4:
			// delayed write
			var index = null;
			for(var i=0; i<freeList.length; i++) {
				var node = getNode(freeList[i]);
				if(node.isDelayedWrite)
					continue;
				index = node.index;
			}

			if(index !== null) {
				makeDelayedWrite(index);
				possibleAction = [6];
				setFixedIndex = index;
			} else {
				possibleAction = [1,2,3];
				delay = 0;
			}
			break;

		case 5:
			// make unbusy
			makeUnbusy(fixedIndex);
			possibleAction = [1,2,3,4];
			break;

		case 6:
			// undelayed write
			makeUndelayedWrite(fixedIndex);
			possibleAction = [1,2,3,4];
			break;
		}

		showResult();

		possibleAction = possibleAction.sort(function() { return Math.random() - 0.5; });
		setTimeout(function() {
			processAction(possibleAction[0], setFixedIndex);
		}, delay);
	}

	function start() {
		for(var i=0; i<processCount; i++) {
			var delay = 1000 + parseInt(Math.random() * 9000);
			setTimeout(function() {
				var action = 1 + parseInt(Math.random() * 4);
				processAction(action);
			}, delay);
		}
	}

	function showTextResult(result) {
		var date = new Date();
		$(".result ul").append("<li>[" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "] " + result + "</li>");
	}

	function showResult() {
		var maxCol = hashQueue[0].length;
		for(var i=1; i<hashResultCount; i++) {
			if(hashQueue[i].length > maxCol)
				maxCol = hashQueue[i].length;
		}

		$(".result table thead").remove();
		$(".result table tbody").remove();

		$thead = $("<thead></thead>");
		$thead.append("<tr></tr>");
		$thead.find("tr").append("<th>hash</th>");
		$thead.find("tr").append("<th colspan='" + maxCol + "'>queue 내용</th>");
		
		$tbody = $("<tbody></tbody>");
		for(var i=0; i<hashResultCount; i++) {
			$tr = $("<tr></tr>");
			$tr.append("<th>" + i + "</th>");
			for(var j=0; j<maxCol; j++) {
				if(j in hashQueue[i]) {
					var node = hashQueue[i][j];
					$td = $("<td></td>");
					$td.append("<div class='buffer'>" + node.index + "</div>");
					if(isFree(node.index)) {
						$td.append("<div class='detail'>free</div>");
						if(node.isDelayedWrite)
							$td.append("<div class='detail'>delayed</div>");
					} else {
						if(node.isBusy)
							$td.append("<div class='detail'>busy</div>");
					}
					$tr.append($td);
				} else {
					$tr.append("<td></td>");
				}
			}
			$tbody.append($tr);
		}
		
		var freeString = "";
		for(var i=0; i<freeList.length; i++) {
			freeString += " => " + freeList[i];
		}

		$(".result table").append($thead).append($tbody);
		$(".result .free-list").text(freeString);
	}

	$("#btn-start").click(function() {
		$(this).attr("disabled", "disabled");
		$("#process-count").attr("disabled", "disabled");
		$("#free-list-count").attr("disabled", "disabled");
		initialize();
		showResult();
		start();
	});
});