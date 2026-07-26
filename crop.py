from PIL import Image, ImageChops

def trim(im):
    bg = Image.new(im.mode, im.size, im.getpixel((0,0)))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

try:
    img = Image.open('desktop-app/build/icon.png')
    img = img.convert('RGBA')
    
    # Make black background transparent
    data = img.getdata()
    newData = []
    for item in data:
        # If the pixel is very dark (almost black), make it transparent
        if item[0] < 15 and item[1] < 15 and item[2] < 15:
            newData.append((0, 0, 0, 0))
        else:
            newData.append(item)
    
    img.putdata(newData)
    
    # Trim transparent edges
    bg = Image.new(img.mode, img.size, (0,0,0,0))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    img.save('desktop-app/build/icon.png')
    print("Icon cropped successfully.")
except Exception as e:
    print("Error:", e)
