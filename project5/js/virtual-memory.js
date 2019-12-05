$(function() {
	var currentTime = -1;
	var total = 0;
	var references = [];
	var isSkip = false;
	var currentType;
	var pageTable = [];
	var pageQueue = [];
	var pageFault = 0;

	function getInputs() {
		total = parseInt($("#frame-size").val());
		references = $("#input").val().split(" ");
		isSkip = $("#skip").is(":checked");
	}

	function calculateFIFO() {
		var item = references[currentTime];

		if(pageTable.indexOf(item) < 0) {
			showResultText("page fault 발생");
			pageFault++;

			if(pageTable.length < total) {
				pageTable.push(item);
				pageQueue.push(item);
			} else {
				var top = pageQueue.shift();
				pageTable[pageTable.indexOf(top)] = item;
				pageQueue.push(item);
			}
		}
	}

	function calculateLRU() {
		var item = references[currentTime];

		if(pageTable.indexOf(item) < 0) {
			showResultText("page fault 발생");
			pageFault++;

			if(pageTable.length < total) {
				pageTable.push(item);
			} else {
				var top = pageQueue.shift();
				pageTable[pageTable.indexOf(top)] = item;
			}
		} else {
			var idx = pageQueue.indexOf(item);
			pageQueue.splice(idx, 1);
		}
		pageQueue.push(item);
	}

	function calculateOptimal() {
		var item = references[currentTime];

		if(pageTable.indexOf(item) < 0) {
			showResultText("page fault 발생");
			pageFault++;

			if(pageTable.length < total) {
				pageTable.push(item);
			} else {
				var predictions = []
				for(var i in pageTable) {
					var found = false;
					for(var j=currentTime+1; j<references.length; j++) {
						if(references[j] == pageTable[i]) {
							predictions.push(j);
							found = true;
							break;
						}
					}
					if(!found)
						predictions.push(Number.MAX_SAFE_INTEGER);
				}

				optimal = predictions[0];
				optimalIdx = 0;
				for(var i=1; i<total; i++) {
					if(predictions[i] > optimal) {
						optimal = predictions[i];
						optimalIdx = i;
					}
				}

				pageTable[optimalIdx] = item;
			}
		}
	}

	function initialize(type) {
		getInputs();
		currentTime = -1;
		pageTable = [];
		pageQueue = [];
		pageFault = 0;
		currentType = type;
	}

	function showTable() {
		var $tbody = $("<tbody>");

		for(var i=0; i<total; i++) {
			$tbody.append($("<tr><td class='page'>page" + i + "</td><td class='reference'>" + pageTable[i] + "</td></tr>"));
		}
		
		$(".result table tbody").remove();
		$(".result table").append($tbody);
	}

	function showResultText(text) {
		$(".result ul").append("<li>" + text + "</li");
	}
	
	function getNext() {
		currentTime++;
		$(".result ul li").remove();
		showResultText("[Time" + currentTime + " / " + currentType + "] 요청 : " + references[currentTime]);

		if(currentType == 'FIFO')
			calculateFIFO();
		else if(currentType == 'LRU')
			calculateLRU();
		else
			calculateOptimal();

		if(isSkip && references.length - 1 > currentTime) {
			getNext();
		} else {
			showResultText("total page fault : " + pageFault);
			showTable();
		}
		
		if(references.length - 1 <= currentTime)
			$("#btn-next").attr("disabled","disabled");
	}

	$("#btn-fifo").click(function() {
		initialize('FIFO');
		$("#frame-size").attr("disabled","disabled");
		$("#input").attr("disabled","disabled");
		$("#result-buttons").css("display","block");
		$("#btn-next").removeAttr("disabled");
		getNext();
	});

	$("#btn-lru").click(function() {
		initialize('LRU');
		$("#frame-size").attr("disabled","disabled");
		$("#input").attr("disabled","disabled");
		$("#result-buttons").css("display","block");
		$("#btn-next").removeAttr("disabled");
		getNext();
	});

	$("#btn-optimal").click(function() {
		initialize('Optimal');
		$("#frame-size").attr("disabled","disabled");
		$("#input").attr("disabled","disabled");
		$("#result-buttons").css("display","block");
		$("#btn-next").removeAttr("disabled");
		getNext();
	});

	$("#btn-next").click(getNext);
});