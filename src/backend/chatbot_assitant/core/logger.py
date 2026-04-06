import logging
import sys

def setup_logger () :
    logger = logging.getLogger(name= "AI Chatbot Shopee")
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(module)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler("chatbot_system.log" ,encoding="utf-8")
    file_handler.setFormatter(formatter)

    if not logger.handlers:
        logger.addHandler(console_handler) 
        logger.addHandler(file_handler)  
        
    return logger
   

system_logger = setup_logger()