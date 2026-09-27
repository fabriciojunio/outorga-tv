' Sobe o servidor do Outorga TV sem abrir janela preta.
' Recebe a pasta web como argumento (o instalador passa).
' O log vai para web\.dados\servidor.log, para quando algo der errado.
'
' Os parênteses no "if" não são enfeite: sem eles, o "& npx ..." vira parte
' do if, e com a pasta .dados já existente o servidor nunca era chamado.
Set shell = CreateObject("WScript.Shell")
pasta = WScript.Arguments(0)
shell.CurrentDirectory = pasta
shell.Run "cmd /c (if not exist .dados mkdir .dados) & npx next start -H 0.0.0.0 -p 3000 >> .dados\servidor.log 2>&1", 0, False
