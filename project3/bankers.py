def print_safe_sequence(allocations, needs, availables, sequence):
	global process_count, instance_count
	if(len(sequence) == process_count):
		print("시작", end=" => ")
		for process_num in sequence:
			print("process{}".format(process_num), end=" => ")
		print("종료")
	else:
		for i in range(process_count):
			if i not in sequence:
				is_safe = True
				for j in range(instance_count):
					if availables[j] < needs[i][j]:
						is_safe = False
						break
				if is_safe:
					new_availables = availables[:]
					new_sequence = sequence[:]
					for j in range(instance_count):
						new_availables[j] = availables[j] + allocations[i][j]
					new_sequence.append(i)					

					print_safe_sequence(allocations, needs, new_availables, new_sequence)

print("[입력]")
print("==== instance 입력 ====")
instances = [] 
instance_count = 0
while instance_count < 9:
	instance = int(input("{}번째 자원의 instance 갯수를 입력해주세요(1~99, 입력종료:0) : ".format(instance_count + 1)))
	if instance == 0:
		break
	if instance < 0 or instance > 99:
		print("[error] instance 갯수를 잘못 입력하셨습니다. 프로그램을 종료합니다.")
		exit()
	instances.append(instance)
	instance_count = instance_count + 1

if instance_count < 2:
	print("[error] 자원 종류는 2개 이상만 가능합니다. 프로그램을 종료합니다.")
	exit()

print("\n==== process 갯수 입력 ====")
process_count = int(input("process 갯수를 입력해주세요(3~99) : "))
if process_count < 3 or process_count > 99:
	print("[error] process 갯수를 잘못 입력하셨습니다. 프로그램을 종료합니다.")
	exit()

print("\n==== allocation 입력 ====")
allocations = []
availables = instances[:]
for i in range(process_count):
	allocation = input("process{}의 자원을 할당해주세요(각 자원은 띄어쓰기로 구분) : ".format(i)).split(" ")
	if len(allocation) != instance_count:
		print("[error] 자원 종류와 입력된 자원의 갯수가 같지 않습니다. 프로그램을 종료합니다.")
		exit()
	for j in range(instance_count):
		allocation[j] = int(allocation[j])
		availables[j] = availables[j] - allocation[j]
		if allocation[j] < 0 or allocation[j] > instances[j] or availables[j] < 0:
			print("[error] 자원 입력이 잘못되었습니다. 프로그램을 종료합니다.")
			exit()
	allocations.append(allocation)

print("\n==== max 입력 ====")
maxes = []
needs = []
for i in range(process_count):
	max_row = input("process{}의 자원의 최대치를 입력해주세요(각 자원은 띄어쓰기로 구분) : ".format(i)).split(" ")
	need = []
	if len(max_row) != instance_count:
		print("[error] 자원 종류와 입력된 자원의 갯수가 같지 않습니다. 프로그램을 종료합니다.")
		exit()
	for j in range(instance_count):
		max_row[j] = int(max_row[j])
		if max_row[j] < 0 or max_row[j] > instances[j] or max_row[j] < allocations[i][j]:
			print("[error] 자원 입력이 잘못되었습니다. 프로그램을 종료합니다.")
			exit()
		need.append(max_row[j] - allocations[i][j])
	maxes.append(max_row)
	needs.append(need)

print("\n[출력]")
print("==== instance ====")
print("instances : ", end="")
for i in range(instance_count):
	print(instances[i], end=" ")
print("")

print("available : ", end="")
for i in range(instance_count):
	print(availables[i], end=" ")
print("")

print("\n==== allocation ====")
for i in range(process_count):
	print("process{} : ".format(i), end="")
	for j in range(instance_count):
		print(allocations[i][j], end=" ")
	print("")

print("\n==== max ====")
for i in range(process_count):
	print("process{} : ".format(i), end="")
	for j in range(instance_count):
		print(maxes[i][j], end=" ")
	print("")

print("\n==== need ====")
for i in range(process_count):
	print("process{} : ".format(i), end="")
	for j in range(instance_count):
		print(needs[i][j], end=" ")
	print("")

print("\n==== 가능한 safe sequence 종류들 ====")
print_safe_sequence(allocations, needs, availables, [])
