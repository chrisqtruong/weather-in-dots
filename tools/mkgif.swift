// mkgif out.gif fps scale frame1.png frame2.png ... — joins PNG frames into a looping GIF
import Foundation
import ImageIO
import UniformTypeIdentifiers
import CoreGraphics
let a = CommandLine.arguments
let fps = Double(a[2])!, scale = Double(a[3])!
let files = Array(a[4...])
let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, UTType.gif.identifier as CFString, files.count, nil)!
CGImageDestinationSetProperties(dst, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]] as CFDictionary)
for f in files {
  let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: f) as CFURL, nil)!
  var img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
  if scale != 1 {
    let w = Int(Double(img.width) * scale), h = Int(Double(img.height) * scale)
    let c = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    c.interpolationQuality = .high; c.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h)); img = c.makeImage()!
  }
  CGImageDestinationAddImage(dst, img, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFDelayTime: 1.0 / fps]] as CFDictionary)
}
CGImageDestinationFinalize(dst)
