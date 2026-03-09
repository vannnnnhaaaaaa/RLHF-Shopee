from abc import ABC, abstractmethod

# 1. TRỪU TƯỢNG (Abstraction): 
# Tạo một bản thiết kế chung. Không thể tạo trực tiếp một 'Employee' chung chung được.
class Employee(ABC) :
    def __init__(self , name , base_salary):
        self.name = name 
        self.__base_salary =  base_salary

    def get_salary (self) :
        return self.__base_salary
    
    @abstractmethod
    def work (self) :
        pass


class BackendDev (Employee) :
    def __init__(self, name, base_salary , framework):
        super().__init__(name, base_salary)
        self.framework = framework

    def work(self):
        return f"{self.name} đang code API bằng {self.framework}."

class AIDev (Employee) :
    def __init__(self, name, base_salary , model_type):
        super().__init__(name, base_salary)
        self.model_type = model_type

    def work(self):
        return f"{self.name} đang train mô hình {self.model_type}." 
    

dev1 = BackendDev("Nam", 7000000, "FastAPI")
ai1 = AIDev("Lan", 8000000, "LLM")

print(dev1.work()) # Output: Nam đang code API bằng FastAPI.
print(ai1.work())  # Output: Lan đang train mô hình LLM.

# Test Đóng gói (Encapsulation)
print(f"Lương của {dev1.name} là: {dev1.get_salary()}")