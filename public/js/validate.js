//This javascript function validates the landing page form input.
function validate()
{
    var username = document.userInput.usernameInput;
    var message = document.getElementById('warning');
    
    if(username.value.length == 0 || title == "")
    {
        alert('Please enter your username');
        username.focus();
        return false;
    }
}