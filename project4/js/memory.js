$(function() {
	var currentTime = -1;
	var memory = [];

	function getInputs() {
		total = parseInt($("#total-memory").val());
		inputs = $("#input").val().split("\n");
		for(var i in inputs) {
			row = inputs[i].split(" ");
			if(row.length != 2) {
				alert("메모리 요청 입력이 올바르지 않습니다.");
				return;
			}
			inputs[i] = {
				process:parseInt(row[0]),
				size:parseInt(row[1])
			}
		}

		return {
			total:total,
			inputs:inputs
		}
	}

	function initialize(total, inputs) {
		currentTime = -1;
		memory = [];
		memory.push({
			process:null,
			start:0,
			size:total
		});
	}

	function sortMemory() {
		for(var i=1; i<memory.length; i++) {
			for(var j=1; j<memory.length; j++) {
				if(memory[j-1].start > memory[j].start) {
					var tmp = memory[j-1];
					memory[j-1] = memory[j];
					memory[j] = tmp;
				}
			}
		}
	}

	function coalescingMemory(position) {
		if(position < memory.length - 1 && memory[position + 1].process === null) {
			showResultText("Coalescing 실행 : " + memory[position].start + "K and " + memory[position + 1].start + "K");
			var currentSize = memory[position + 1].size;
			memory[position].size = memory[position].size + currentSize;
			memory.splice(position + 1, 1);
		}

		if(position > 0 && memory[position - 1].process === null) {
			showResultText("Coalescing 실행 : " + memory[position-1].start + "K and " + memory[position].start + "K");
			var currentSize = memory[position - 1].size;
			memory[position].start = memory[position - 1].start;
			memory[position].size = memory[position].size + currentSize;
			memory.splice(position - 1, 1);
			return position - 1;
		} else {
			return position;
		}
	}

	function calculateBestFit(total, inputs) {
		var input = inputs[currentTime];

		if(input.size == 0)
			showResultText("[Time " + currentTime + "] 요청 : Process" + input.process + " Free");
		else
			showResultText("[Time " + currentTime + "] 요청 : Process" + input.process + " - " + input.size + "K");
		
		// release
		for(var i in memory) {
			if(memory[i].process == input.process) {
				if(input.size != 0) {
					alert("메모리가 두번 요청되었습니다.");
					return;
				}
				memory[i].process = null;
				return memory[coalescingMemory(parseInt(i))];
			}
		}
		
		// allocate
		var bestFitSize = Number.MAX_SAFE_INTEGER;
		var bestFitPosition = -1;
		for(var i in memory) {
			if(memory[i].process === null && memory[i].size >= input.size && memory[i].size < bestFitSize) {
				bestFitSize = memory[i].size;
				bestFitPosition = i;
			}
		}

		if(bestFitPosition != -1) {
			var currentSize = memory[bestFitPosition].size;
			memory[bestFitPosition].process = input.process;
			memory[bestFitPosition].size = input.size;
			if(currentSize - input.size > 0) {
				memory.push({
					process:null,
					start:memory[bestFitPosition].start + input.size,
					size:currentSize - input.size
				});
			}
			sortMemory();
			return memory[bestFitPosition];
		} else {
			// compaction
			showResultText("Compaction 수행 시작 : 빈공간 채워넣기로 시도중...");
			var firstPadding = 0;
			var lastPadding = 0;
			if(memory[0].process === null)
				firstPadding = memory[0].size;
			if(memory[memory.length - 1].process === null)
				lastPadding = memory[memory.length - 1].size;

			for(var i=1; i<memory.length; i++) {
				if(memory[i].process !== null) {
					if(memory[i].size == firstPadding) {
						memory[0].process = memory[i].process;
						memory[i].process = null;
						firstPadding = 0;
						coalescingMemory(i);
					} else if(memory[i].size == lastPadding) {
						memory[memory.length - 1].process = memory[i].process;
						memory[i].process = null;
						lastPadding = 0;
						if(coalescingMemory(i) < i)
							i--;
					}
				}
			}
			
			blankCount = 0;
			for(var i in memory) {
				if(memory[i].process === null)
					blankCount++;
			}

			if(blankCount == 0) {
				alert("빈공간이 없어 할당할 수 없습니다.");
				return;
			} else if(blankCount == 1) {
				// 빈공간 채워넣기로 compaction 완료한 경우
				showResultText("Compaction 수행 완료 : 빈공간 채워넣기로 수행 완료, 재요청...");
				calculateBestFit(total, inputs);
			} else {
				showResultText("Compaction 수행 완료 : 빈공간 채워넣기로 수행 실패하여 브루트포스로 수행함, 재요청...");
				newMemory = [];
				newMemoryStart = 0;
				for(var i in memory) {
					if(memory[i].process !== null) {
						newMemory.push({
							process:memory[i].process,
							start:newMemoryStart,
							size:memory[i].size
						});
						newMemoryStart += memory[i].size;
					}
				}
				if(newMemoryStart != total) {
					newMemory.push({
						process:null,
						start:newMemoryStart,
						size:total - newMemoryStart
					});
				}
				memory = newMemory;
				calculateBestFit(total, inputs);
			}
		}
	}

	function showFreeBlocks() {
		var freeBlocks = 0;
		var freeBlockCount = 0;
		for(var i in memory) {
			if(memory[i].process === null) {
				freeBlocks += memory[i].size;
				freeBlockCount++;
			}
		}

		showResultText("Free Block : " + freeBlockCount + "개, 평균크기 = " + (freeBlocks / freeBlockCount) + "K");
	}

	function showTable(total) {
		var $tbody = $("<tbody>");
		
		for(var i in memory) {
			$tr = $("<tr><td class='process'></td></tr>");

			$tr.prepend("<td class='address'><\/td>");
			$tr.find(".address").text(memory[i].start + "K ~ " + (memory[i].start + memory[i].size) + "K");
			$tr.find(".process").text((memory[i].process === null) ? "비어있음" : ("Process" + memory[i].process));

			$tbody.append($tr);
		}
		
		$(".result table tbody").remove();
		$(".result table").append($tbody);
	}

	function showResultText(text) {
		$(".result ul").append("<li>" + text + "</li");
	}
	
	function getNext(total, inputs) {
		currentTime++;
		$(".result ul li").remove();
		calculateBestFit(total, inputs);
		showTable(data.total);
		showFreeBlocks();
	}

	$("#btn-result").click(function() {
		data = getInputs();
		initialize(data.total, data.inputs);
		getNext(data.total, data.inputs);
		$("#total-memory").attr("disabled","disabled");
		$("#input").attr("disabled","disabled");
		$("#result-buttons").css("display","block");
	});

	$("#btn-next").click(function() {
		data = getInputs();
		getNext(data.total, data.inputs);
		if(data.inputs.length - 1 <= currentTime)
			$(this).attr("disabled","disabled");
	});
});