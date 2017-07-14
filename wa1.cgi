#!/data/data/com.termux/files/usr/bin/python

print("Content-Type: text/plain")
print()

import cgi,sys
form = cgi.FieldStorage()
symbol = form.getfirst('symbol')
if symbol is not None:
    sys.argv.append(symbol)
sys.path.insert(0,'/data/data/com.termux/files/home/project/webapp1')
import p1
